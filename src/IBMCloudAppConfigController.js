/*
 * (C) Copyright IBM Corp. 2021.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

const objectPath = require('object-path');
const { BaseController, FetchEnvs } = require('@razee/razeedeploy-core');

const { AppConfigurationCore, UrlBuilder, Logger } = require('ibm-appconfiguration-node-core');
const { AppConfigurationFeature } = require('ibm-appconfiguration-node-feature');

// Enable logger
var appconfigLogger = Logger.getInstance();
appconfigLogger.setDebug(true);


module.exports = class IBMCloudAppConfigController extends BaseController {

  constructor(params) {
    params.finalizerString = params.finalizerString || 'client.ibmcloudappconfig.deploy.razee.io';
    super(params);
  }

  async added() {
    //Initialization
    let guid = objectPath.get(this.data, ['object', 'spec', 'guid']);
    let collectionId = objectPath.get(this.data,  ['object', 'spec', 'collection_id']);
    let apikey = objectPath.get(this.data,  ['object', 'spec', 'apikey']);
    let apikeyRef = objectPath.get(this.data, ['object', 'spec', 'apikeyRef']);
   
    let attributesPairs = objectPath.get(this.data, ['object', 'spec', 'attributes']);
    let attributes = {};
    let url = objectPath.get(this.data, ['object', 'spec' ,'url']);
    let region = objectPath.get(this.data, ['object', 'spec', 'region']);
    if (apikeyRef) {
      let secretName = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.name');
      let secretNamespace = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.namespace', this.namespace);
      let secretKey = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.key');
      apikey = await this._getSecretData(secretName, secretKey, secretNamespace);
    }
    let coreClient = AppConfigurationCore.getInstance({ 
       region: region,
       guid: guid,
       apikey: apikey
    });
    let client = AppConfigurationFeature.getInstance({
       collectionId: collectionId
    });
    if (attributesPairs) {
      attributesPairs.forEach(attr => attributes[attr.name] = attr.value);
      client.setClientAttributes(attributes);
    }
    let featuresList = {};

    let features = {};
    let featureMap = {};
    let patchObject = {
      metadata: {
	labels: {

	}
      },
      data: {}
    };
    const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));
    sleep(10000).then(() => {
       features = client.getFeatures();
       featuresList = Object.keys(features);
       featuresList.forEach((feature) => {
	   featureMap[feature] = features[feature].getCurrentValue();
       });
       patchObject.data = featureMap;
       this.patchSelf(patchObject)
          .then(res => objectPath.set(this.data, 'object', res) );
    });
    // Get the current values of all the features
    client.emitter.on('featuresUpdate', (f) => {
       let features = client.getFeatures();
       // Update the features' current values
       featuresList = Object.keys(features);
       featuresList.forEach((feature) => {
          featureMap[feature] = features[feature].getCurrentValue();
       });
       patchObject.data = featureMap;
       this.patchSelf(patchObject)
          .then(res => objectPath.set(this.data, 'object', res) );
    }); 
  }

  async _getSecretData(name, key, ns) {
    if (!name || !key) {
      return;
    }
    let res = await this.kubeResourceMeta.request({ uri: `/api/v1/namespaces/${ns || this.namespace}/secrets/${name}`, json: true });
    let secret = Buffer.from(objectPath.get(res, ['data', key], ''), 'base64').toString();
    return secret;
  }

  dataToHash(resource) {
    // Override if you have other data as important.
    // Changes to these sections allow modify event to proceed.
    return {
      labels: objectPath.get(resource, 'metadata.labels'),
      spec: objectPath.get(resource, 'spec'),
      FeatureFlagUpdateReceived: objectPath.get(resource, 'status.FeatureFlagUpdateReceived'),
      IdentityUpdateReceived: objectPath.get(resource, 'status.IdentityUpdateReceived')
    };
  }

  async finalizerCleanup() {
    objectPath.empty(this.data, 'object.spec');
    objectPath.empty(this.data, 'object.data');
  }

};
