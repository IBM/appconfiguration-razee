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

const {AppConfiguration} = require('ibm-appconfiguration-node-sdk');

module.exports = class IBMCloudAppConfigController extends BaseController {

  constructor(params) {
    params.finalizerString = params.finalizerString || 'client.ibmcloudappconfig.deploy.razee.io';
    super(params);
  }

  async added() {
    //Initialization
    let guid = objectPath.get(this.data, ['object', 'spec', 'guid']);
    let identityId = objectPath.get(this.data, ['object', 'spec', 'identityId']);
    let collectionId = objectPath.get(this.data,  ['object', 'spec', 'collectionId']);
    let apikey = objectPath.get(this.data,  ['object', 'spec', 'apikey']);
    let apikeyRef = objectPath.get(this.data, ['object', 'spec', 'apikeyRef']);
   
    let attributesPairs = objectPath.get(this.data, ['object', 'spec', 'identityAttributes']);
    let attributes = {};
    let url = objectPath.get(this.data, ['object', 'spec' ,'url']);
    let region = objectPath.get(this.data, ['object', 'spec', 'region']);
    if (apikeyRef) {
      let secretName = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.name');
      let secretNamespace = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.namespace', this.namespace);
      let secretKey = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.key');
      apikey = await this._getSecretData(secretName, secretKey, secretNamespace);
    }
    const client = AppConfiguration.getInstance();
    client.init(region, guid, apikey);
    client.setCollectionId(collectionId);
    if (attributesPairs) {
      attributesPairs.forEach(attr => attributes[attr.name] = attr.value);
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
    sleep(5000).then(() => {
       features = client.getFeatures();
       featuresList = Object.keys(features);
       featuresList.forEach((feature) => {
	   featureMap[feature] = features[feature].getCurrentValue(identityId, attributes);
       });
       patchObject.data = featureMap;
       this.patchSelf(patchObject)
          .then(res => objectPath.set(this.data, 'object', res) );
    });
    // Get the current values of all the features
    
    if(client.emitter.listenerCount('featuresUpdate') < 1) {
        client.emitter.on('featuresUpdate', (f) => {
           let existingFeaturesList = [];
           if (this.data.object.data) {
             existingFeaturesList = Object.keys(this.data.object.data);
           }
	   let features = client.getFeatures();
               
	   featuresList = Object.keys(features);
           if (existingFeaturesList.length > featuresList.length) {
           // Feature is deleted
             let featuresToDelete =  existingFeaturesList
                                     .filter(x => !featuresList.includes(x));
             featuresToDelete.forEach(feature => featureMap[feature] = null);
           }
	   // Update the features' current values
	   featuresList.forEach((feature) => {
	      featureMap[feature] = features[feature].getCurrentValue(identityId, attributes);
	   });
	   patchObject.data = featureMap;
	   this.patchSelf(patchObject)
	       .then(res => objectPath.set(this.data, 'object', res) );
	   }); 
    }
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
