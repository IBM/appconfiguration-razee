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

const flagPrefix = "flag-";
const propPrefix = "prop-";
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
    let environmentId = objectPath.get(this.data,  ['object', 'spec', 'environmentId']);
    let apikey = objectPath.get(this.data,  ['object', 'spec', 'apikey']);
    let apikeyRef = objectPath.get(this.data, ['object', 'spec', 'apikeyRef']);
   
    let attributesPairs = objectPath.get(this.data, ['object', 'spec', 'identityAttributes']);
    let attributes = {};
    let region = objectPath.get(this.data, ['object', 'spec', 'region']);
    if (apikeyRef) {
      let secretName = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.name');
      let secretNamespace = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.namespace', this.namespace);
      let secretKey = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.key');
      apikey = await this._getSecretData(secretName, secretKey, secretNamespace);
    }
    const client = AppConfiguration.getInstance();
    client.init(region, guid, apikey);
    client.setContext(collectionId, environmentId);
    if (attributesPairs) {
      attributesPairs.forEach(attr => attributes[attr.name] = attr.value);
    }
    let featuresList = {};
    let propertiesList = {};

    let features = {};
    let featureMap = {};
    let properties = {};
    let propertyMap = {};
    let configurationsMap = {};
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
       properties = client.getProperties();
       
       featuresList = Object.keys(features);
       propertiesList = Object.keys(properties);
       featuresList.forEach((feature) => {
	   featureMap[flagPrefix + feature] = features[feature].getCurrentValue(identityId, attributes);
       });
       propertiesList.forEach((property) => {
           propertyMap[propPrefix + property] = properties[property].getCurrentValue(identityId, attributes);
       });
       configurationsMap = {...featureMap, ...propertyMap};
       patchObject.data = configurationsMap;
       this.patchSelf(patchObject)
          .then(res => objectPath.set(this.data, 'object', res) );
    });
    // Get the current values of all the features
    
    if(client.emitter.listenerCount('configurationUpdate') < 1) {
        client.emitter.on('configurationUpdate', (f) => {
           let existingConfigurationsList = [];
           if (this.data.object.data) {
             existingConfigurationsList = Object.keys(this.data.object.data);
           }
           let newFeatures = client.getFeatures();
           let newProperties = client.getProperties();
           let newConfigurations = Object.keys(newFeatures).map(f => flagPrefix + f).concat(Object.keys(newProperties).map(p => propPrefix + p));
           let newConfigurationsList = Object.keys(newConfigurations);
           if (existingConfigurationsList.length > newConfigurationsList.length) {
             // Feature or properties to be deleted
             let configurationsToDelete = existingConfigurationsList.
                                           filter(x => !newConfigurationsList.includes(x)); 
             configurationsToDelete.forEach(config => configurationsMap[config] = null);
           }
           Object.keys(newFeatures).forEach((f) => {
             configurationsMap[flagPrefix + f] = newFeatures[f].getCurrentValue(identityId, attributes);
           });
           Object.keys(newProperties).forEach((p) => {
             configurationsMap[propPrefix + p] = newProperties[p].getCurrentValue(identityId, attributes);
           });
           patchObject.data = configurationsMap;
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
