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

const { EventHandler, KubeClass, KubeApiConfig } = require('@razee/kubernetes-util');
const kubeApiConfig = KubeApiConfig();

const ControllerString = 'IBMCloudAppConfig';
const log = require('./bunyan-api').createLogger(ControllerString);
const version = 'v1beta1';

async function createClassicEventHandler(kc) {
  let result;
  let resourceMeta = await kc.getKubeResourceMeta('kapitan.razee.io/'+ version, ControllerString, 'watch');
  if (resourceMeta) {
    const Controller = require(`./${ControllerString}Controller`);
    let params = {
      kubeResourceMeta: resourceMeta,
      factory: Controller,
      kubeClass: kc,
      logger: log,
      requestOptions: { qs: { timeoutSeconds: process.env.CRD_WATCH_TIMEOUT_SECONDS || 300 } },
      livenessInterval: true,
      finalizerString: 'client.ibmcloudappconfig.kapitan.razee.io'
    };
    result = new EventHandler(params);
  } else {
    log.info(`Unable to find KubeResourceMeta for kapitan.razee.io/${version}: ${ControllerString}`);
  }
  return result;
}

async function createNewEventHandler(kc) {
  let result;
  let resourceMeta = await kc.getKubeResourceMeta('deploy.razee.io/' + version, ControllerString, 'watch');
  if (resourceMeta) {
    const Controller = require(`./${ControllerString}Controller`);
    let params = {
      kubeResourceMeta: resourceMeta,
      factory: Controller,
      kubeClass: kc,
      logger: log,
      requestOptions: { qs: { timeoutSeconds: process.env.CRD_WATCH_TIMEOUT_SECONDS || 300 } },
      livenessInterval: true
    };
    result = new EventHandler(params);
  } else {
    log.error(`Unable to find KubeResourceMeta for deploy.razee.io/${version} : ${ControllerString}`);
  }
  return result;
}

async function main() {
  log.info(`Running ${ControllerString}Controller.`);
  const kc = new KubeClass(kubeApiConfig);
  const eventHandlers = [];
  eventHandlers.push(createClassicEventHandler(kc));
  eventHandlers.push(createNewEventHandler(kc));
  return eventHandlers;
}

main().catch(e => log.error(e));
