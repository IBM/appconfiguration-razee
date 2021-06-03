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
    let entityId = objectPath.get(this.data, ['object', 'spec', 'entityId']);
    let collectionId = objectPath.get(this.data,  ['object', 'spec', 'collectionId']);
    let environmentId = objectPath.get(this.data,  ['object', 'spec', 'environmentId']);
    let apikey = objectPath.get(this.data,  ['object', 'spec', 'apikey']);

    let guidRef = objectPath.get(this.data, ['object', 'spec', 'guidRef']);
    let entityIdRef = objectPath.get(this.data, ['object', 'spec', 'entityIdRef']);
    let collectionIdRef = objectPath.get(this.data,  ['object', 'spec', 'collectionIdRef']);
    let environmentIdRef = objectPath.get(this.data,  ['object', 'spec', 'environmentIdRef']);
    let apikeyRef = objectPath.get(this.data, ['object', 'spec', 'apikeyRef']);
   
    let attributesPairs = objectPath.get(this.data, ['object', 'spec', 'entityAttributes']);
    let attributes = {};
    let region = objectPath.get(this.data, ['object', 'spec', 'region']);
    let regionRef = objectPath.get(this.data, ['object', 'spec', 'regionRef']);
    if (apikeyRef) {
      let secretName = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.name');
      let secretNamespace = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.namespace', this.namespace);
      let secretKey = objectPath.get(apikeyRef, 'valueFrom.secretKeyRef.key');
      apikey = await this._getSecretData(secretName, secretKey, secretNamespace);
    }
    if (collectionIdRef) {
      let cmName = objectPath.get(collectionIdRef, 'valueFrom.configMapRef.name');
      let cmNamespace = objectPath.get(collectionIdRef, 'valueFrom.configMapRef.namespace', this.namespace);
      let cmKey = objectPath.get(collectionIdRef, 'valueFrom.configMapRef.key');
      collectionId = await this._getConfig(cmName, cmKey, cmNamespace);
    }
    if (environmentIdRef) {
      let cmName = objectPath.get(environmentIdRef, 'valueFrom.configMapRef.name');
      let cmNamespace = objectPath.get(environmentIdRef, 'valueFrom.configMapRef.namespace', this.namespace);
      let cmKey = objectPath.get(environmentIdRef, 'valueFrom.configMapRef.key');
      environmentId = await this._getConfig(cmName, cmKey, cmNamespace);
    }
    if (entityIdRef) {
      let cmName = objectPath.get(entityIdRef, 'valueFrom.configMapRef.name');
      let cmNamespace = objectPath.get(entityIdRef, 'valueFrom.configMapRef.namespace', this.namespace);
      let cmKey = objectPath.get(entityIdRef, 'valueFrom.configMapRef.key');
      entityId = await this._getConfig(cmName, cmKey, cmNamespace);
    }
    if (guidRef) {
      let cmName = objectPath.get(guidRef, 'valueFrom.configMapRef.name');
      let cmNamespace = objectPath.get(guidRef, 'valueFrom.configMapRef.namespace', this.namespace);
      let cmKey = objectPath.get(guidRef, 'valueFrom.configMapRef.key');
      guid = await this._getConfig(cmName, cmKey, cmNamespace);
    }
    if (regionRef) {
      let cmName = objectPath.get(regionRef, 'valueFrom.configMapRef.name');
      let cmNamespace = objectPath.get(regionRef, 'valueFrom.configMapRef.namespace', this.namespace);
      let cmKey = objectPath.get(regionRef, 'valueFrom.configMapRef.key');
      region = await this._getConfig(cmName, cmKey, cmNamespace);
    }
    const client = AppConfiguration.getInstance();
    client.init(region, guid, apikey);
    client.setContext(collectionId, environmentId);
    if (attributesPairs) {
      for (const attrPair of attributesPairs) {
         if (attrPair.valueFrom) {
	   // value is referenced from some configmap 
	   let cmName = objectPath.get(attrPair.valueFrom, 'configMapRef.name');
	   let cmNamespace = objectPath.get(attrPair.valueFrom, 'configMapRef.namespace', this.namespace);
	   let cmKey = objectPath.get(attrPair.valueFrom, 'configMapRef.key');
	   let value = await this._getConfig(cmName, cmKey, cmNamespace);
           attributes[attrPair.name] = value;
         } else {
           attributes[attrPair.name] = attrPair.value;
         }
      }
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
    sleep(10000).then(() => {
       features = client.getFeatures();
       properties = client.getProperties();
       
       featuresList = Object.keys(features);
       propertiesList = Object.keys(properties);
       featuresList.forEach((feature) => {
	   featureMap[flagPrefix + feature] = features[feature].getCurrentValue(entityId, attributes);
       });
       propertiesList.forEach((property) => {
           propertyMap[propPrefix + property] = properties[property].getCurrentValue(entityId, attributes);
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
             configurationsMap[flagPrefix + f] = newFeatures[f].getCurrentValue(entityId, attributes);
           });
           Object.keys(newProperties).forEach((p) => {
             configurationsMap[propPrefix + p] = newProperties[p].getCurrentValue(entityId, attributes);
           });
           patchObject.data = configurationsMap;
	   this.patchSelf(patchObject)
	       .then(res => objectPath.set(this.data, 'object', res) );
        });
    }
  }

  async _getConfig(name, key, ns) {
    if (!name || !key) {
      return;
    }
    let res = await this.kubeResourceMeta.request({ uri: `/api/v1/namespaces/${ns || this.namespace}/configmaps/${name}`, json: true });
    // let cm = Buffer.from(objectPath.get(res, ['data', key], ''), 'base64').toString();
    let cm = objectPath.get(res, ['data', key], '');
    return cm;
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
