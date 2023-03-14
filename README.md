# WARNING: This repository is no longer maintained :warning:

> This repository will not be updated. The repository will be kept available in read-only mode.

- [IBMCloudAppConfig](#IBMCloudAppConfig)
  - [Pre-requisites](#pre-requisites)
  - [Install](#install)
  - [Resource Definition](#resource-definition)
    - [Sample](#sample)
    - [Spec](#spec)
  - [Getting Started](#getting-started)
    - [Configure IBM Cloud App Config service Instance](#)
    - [Configure the IBM Cloud App Config Razee plugin](#)
    
  - [Tutorial](#tutorial)
    - [Controlling kubernetes deployment of resources (ConfigMaps, Deployments etc) with App Configuration Feature Flag](#controlling-kubernetes-deployment-of-resources-configmaps-deployments-etc-with-app-configuration-feature-flag)
# IBMCloudAppConfig
IBMCloudAppConfig is a custom resource based on [Razee](https://razee.io/). IBMCloudAppConfig is built using the IBM Cloud App Configuration Node.js SDK to fetch and evaluate configurations (features and properties) values. The feature flag and property values are made available to resources on the Kubernetes cluster.

## Pre-requisites
* Install `kubectl` on your terminal to interact with your kubernetes cluster.
* Signup with [IBM cloud](https://cloud.ibm.com).
* The IBMCloudAppConfig razee plugin is built by extending the base controller of Razee.
* Install Razee from the official razee distribution using the following command:
    ```
    kubectl apply -f https://github.com/razee-io/RazeeDeploy-delta/releases/latest/download/resource.yaml
    ```
    Example Output

    ```
    namespace/razee created
    serviceaccount/razeedeploy-sa created
    clusterrole.rbac.authorization.k8s.io/razeedeploy-admin-cr created
    clusterrolebinding.rbac.authorization.k8s.io/razeedeploy-rb created
    configmap/razeedeploy-delta-resource-uris created
    deployment.apps/razeedeploy-delta created
    ```

* Once razee is installed, verify that the RazeeDeploy components are deployed. You must see one pod per component and each pod must be in a Running state before you proceed with the next step. It may take a few minutes to get all the pods in Running state.

    ```
    kubectl get pods -n razee
    ```
    Example output:

    ```
    NAME                                           READY   STATUS    RESTARTS   AGE
    featureflagsetld-controller-8d86b95bf-lrpln    1/1     Running   0          76s
    managedset-controller-74876947db-bhrjt         1/1     Running   0          75s
    mustachetemplate-controller-674fdd9498-ntlgs   1/1     Running   0          74s
    razeedeploy-delta-6d7859b7cc-rd57f             1/1     Running   0          104s
    remoteresource-controller-756bdbf544-t87sz     1/1     Running   0          72s
    remoteresources3-controller-59b5c454bd-r2pr9   1/1     Running   0          71s
    ```

## Install 

* Now install the IBM Cloud App Configuration controller - razee plugin in your cluster.
* Download the `resource.yaml` provided in the root of this project. This has the official docker image specified in the yaml. It is recommended to use the latest tag of the image.

    ```
    kubectl create -f resource.yaml -n razee
    ```
* Once the plugin is installed, verify the deployments under razee namespace. You should see `appconfigibm-controller` in the list of deployments.

    ```
    kubectl get deployments -n razee
    ```

    Example Output
    ```
    NAME                          READY   UP-TO-DATE   AVAILABLE   AGE
    appconfigibm-controller       1/1     1            1           43m
    featureflagsetld-controller   1/1     1            1           35h
    managedset-controller         1/1     1            1           35h
    mustachetemplate-controller   1/1     1            1           35h
    razeedeploy-delta             1/1     1            1           35h
    remoteresource-controller     1/1     1            1           35h
    remoteresources3-controller   1/1     1            1           35h
    ```

## Resource Definition

### Sample

```yaml
apiVersion: deploy.razee.io/v1beta1
kind: IBMCloudAppConfig
metadata:
  name: appconfig-set
  namespace: default
spec:
  entityId: <"unique entity id like '123'">
  region: "us-south"
  guid: "<YOUR_GUID>"
  collectionId: "dev"
  environmentId: "dev"
  entityAttributes:
    - name: cluster-type
      value: 'minikube'
  apikeyRef:
    valueFrom:
      secretKeyRef:
        name: secret-apikey
        key: apikey
        namespace: default
```

#### Spec

**Path**: `.spec`</br>
**Description**: `spec` is required and **must** include allof `entityId`, `region`, `guid`, `collectionId`, `environmentId`. It **must** include oneOf `apikey` or `apikeyRef`. Client attributes `entityAttributes` object is optional.
**Schema**:
```yaml
                spec:
                  type: object
                  x-kubernetes-preserve-unknown-fields: true
                  allOf:
                  oneOf:
                    - required: [entityId]
                    - required: [entityIdRef]
                  # you must define oneOf:
                  oneOf:
                    - required: [region]
                    - required: [regionRef]
                  oneOf:
                    - required: [collectionId]
                    - required: [collectionIdRef]
                  oneOf:
                    - required: [environmentId]
                    - required: [environmentIdRef]
                  oneOf:
                    - required: [guid]
                    - required: [guidRef]
                  oneOf:
                    - required: [apikey]
                    - required: [apikeyRef]
                  properties:
                    entityId:
                      type: string
                    region:
                      type: string
                    collectionId:
                      type: string
                    environmentId:
                      type: string
                    guid:
                      type: string
                    apikey:
                      type: string
                    entityIdRef:
                      type: object
                      required: [valueFrom]
                      properties:
                        valueFrom:
                          type: object
                          required: [configMapRef]
                          properties:
                            configMapRef:
                              type: object
                              required: [name, key]
                              properties:
                                name:
                                  type: string
                                key:
                                  type: string
                                namespace:
                                  type: string
                    regionRef:
                      type: object
                      required: [valueFrom]
                      properties:
                        valueFrom:
                          type: object
                          required: [configMapRef]
                          properties:
                            configMapRef:
                              type: object
                              required: [name, key]
                              properties:
                                name:
                                  type: string
                                key:
                                  type: string
                                namespace:
                                  type: string
                    collectionIdRef:
                      type: object
                      required: [valueFrom]
                      properties:
                        valueFrom:
                          type: object
                          required: [configMapRef]
                          properties:
                            configMapRef:
                              type: object
                              required: [name, key]
                              properties:
                                name:
                                  type: string
                                key:
                                  type: string
                                namespace:
                                  type: string
                    environmentIdRef:
                      type: object
                      required: [valueFrom]
                      properties:
                        valueFrom:
                          type: object
                          required: [configMapRef]
                          properties:
                            configMapRef:
                              type: object
                              required: [name, key]
                              properties:
                                name:
                                  type: string
                                key:
                                  type: string
                                namespace:
                                  type: string
                    guidRef:
                      type: object
                      required: [valueFrom]
                      properties:
                        valueFrom:
                          type: object
                          required: [configMapRef]
                          properties:
                            configMapRef:
                              type: object
                              required: [name, key]
                              properties:
                                name:
                                  type: string
                                key:
                                  type: string
                                namespace:
                                  type: string
                    apikeyRef:
                      type: object
                      required: [valueFrom]
                      properties:
                        valueFrom:
                          type: object
                          required: [secretKeyRef]
                          properties:
                            secretKeyRef:
                              type: object
                              required: [name, key]
                              properties:
                                name:
                                  type: string
                                key:
                                  type: string
                                namespace:
                                  type: string
                    entityAttributes:
                      type: array
                      items:
                        type: object
                        properties:
                          name:
                            type: string
                          value:
                            type: string
```
##### entityId
**Path**: `.spec.entityId`</br>
**Description**: entityId is a unique parameter required to perform the feature flag evaluations.
**Schema**:
```yaml
entityId:
  type: string
```

##### entityIdRef
**Path**: `.spec.entityIdRef`</br>
**Description**: entityIdRef is reference to configmap to read unique parameter required to perform the feature flag evaluations.
**Schema**:
```yaml
    entityIdRef:
      type: object
      required: [valueFrom]
      properties:
        valueFrom:
          type: object
          required: [configMapRef]
          properties:
            configMapRef:
              type: object
              required: [name, key]
              properties:
                name:
                  type: string
                key:
                  type: string
                namespace:
                  type: string
```

##### region
**Path**: `.spec.region`</br>
**Description**: Region is required to identify the region in which IBM Cloud App Configuration instance is provisioned.
**Schema**:
```yaml
region:
  type: string
```

##### regionRef
**Path**: `.spec.regionRef`</br>
**Description**: RegionRef is a reference to configmap to read region value which is required to identify the region in which IBM Cloud App Configuration instance is provisioned.
**Schema**:
```yaml
    regionRef:
      type: object
      required: [valueFrom]
      properties:
      valueFrom:
        type: object
        required: [configMapRef]
        properties:
          configMapRef:
            type: object
            required: [name, key]
            properties:
              name:
                type: string
              key:
                type: string
              namespace:
                type: string
```

##### collectionId
**Path**: `.spec.collectionId`</br>
**Description**: Collection ID is required to identify the collection which groups the flag flag values required in the kubernetes cluster. The plugin is designed to work with one collection per cluster.
**Schema**:
```yaml
collectionId:
  type: string
```

##### collectionIdRef
**Path**: `.spec.collectionIdRef`</br>
**Description**: Collection ID can be read from a configmap and is required to identify the collection which groups the flag flag values required in the kubernetes cluster. The plugin is designed to work with one collection per cluster.
**Schema**:
```yaml
    collectionIdRef:
      type: object
      required: [valueFrom]
      properties:
        valueFrom:
          type: object
          required: [configMapRef]
          properties:
            configMapRef:
              type: object
              required: [name, key]
              properties:
                name:
                  type: string
                key:
                  type: string
                namespace:
                  type: string
```
##### environmentId
**Path**: `.spec.environmentId`</br>
**Description**:  Id of the environment created in App Configuration service instance under the Environments section
**Schema**:
```yaml
environmentId:
  type: string
```

##### environmentIdRef
**Path**: `.spec.environmentIdRef`</br>
**Description**:  Configmap reference to Id of the environment created in App Configuration service instance under the Environments section
**Schema**:
```yaml
    environmentIdRef:
      type: object
      required: [valueFrom]
      properties:
        valueFrom:
          type: object
          required: [configMapRef]
          properties:
            configMapRef:
              type: object
              required: [name, key]
              properties:
                name:
                  type: string
                key:
                  type: string
                namespace:
                  type: string
```

##### guid
**Path**: `.spec.guid`</br>
**Description**: GUID is required to identify the IBM Cloud App Configuration instance.
**Schema**:
```yaml
guid:
  type: string
```

##### guidRef
**Path**: `.spec.guidRef`</br>
**Description**: Configmap Reference to GUID and is required to identify the IBM Cloud App Configuration instance.
**Schema**:
```yaml
    guidRef:
      type: object
      required: [valueFrom]
      properties:
        valueFrom:
          type: object
          required: [configMapRef]
          properties:
            configMapRef:
              type: object
              required: [name, key]
              properties:
                name:
                  type: string
                key:
                  type: string
                namespace:
                  type: string
```
##### apikey
**Path**: `.spec.apikey`</br>
**Description**: apikey is required to authenticate the API calls made by the razee plugin to IBM Cloud App Configuration.=
**Schema**:
```yaml
apikey:
  type: string
```

##### apikeyRef
**Path**: `.spec.apikeyRef`</br>
**Description**: apikeyRef is the recommended way to pass the apikey from kubernetes secrets.
**Schema**:
```yaml
 apkeyRef:
    type: object
    required: [valueFrom]
    properties:
      valueFrom:
        type: object
        required: [secretKeyRef]
        properties:
          secretKeyRef:
            type: object
            required: [name, key]
            properties:
              name:
                type: string
              key:
                type: string
              namespace:
                type: string
```

##### entityAttributes
**Path**: `.spec.entityAttributes`</br>
**Description**: entityAttributes are **optional** client attributes used for targetting flag values to a segment of clusters/users. It requires a list of name-value pairs. A value can be read from a configMap to using `valueFrom` property.
**Schema**:
```yaml
entityAttributes:
  type: array
  items:
    type: object
    required: [name]
    oneOf:
      - required: [value]
      - required: [valueFrom]
    properties:
      name:
        type: string
      value:
        type: string
      valueFrom:
        type: object
        required: [configMapRef]
        properties:
          configMapRef:
            type: object
            required: [name, key]
            properties:
              name:
                type: string
              key:
                type: string
              namespace:
                type: string
```
## Getting Started
### Configure IBM Cloud App Configuration service instance
* Create an instance of IBM Cloud App Configuration service.
* Create a collection. An Environment with ID: "dev" is created by default. You can also create other environments.
* Create feature flags and properties from the service dashboard.
* Feature flags and properties in other environments are created by default with default values for each features and properties.
* Go to service credentials tab and create new credentials.

#### Configure the IBM Cloud App Configuration Razee plugin
* Create a yaml file `appconfig.yaml` with the following specifcations. Assuming the `apikey` is stored in a kubernetes secret. Alternatively, you can pass the `apikey` as string too.
```yaml
apiVersion: deploy.razee.io/v1beta1
kind: IBMCloudAppConfig
metadata:
  name: appconfig-set
  namespace: default
spec:
  entityId: "<unique entity id like '123'>"
  region: "us-south"
  guid: "<GUID>"
  collectionId: "dev"
  environmentId: "dev"
  entityAttributes:
    - name: cluster-type
      value: 'minikube'
  apikeyRef:
    valueFrom:
      secretKeyRef:
        name: secret-apikey
        key: apikey
        namespace: default
```
* Create a resource of kind `IBMCloudAppConfig` by running the following command.
    ```
    kubectl create -f appconfig.yaml
    ``` 
* The above resource creates a custom resource of kind `IBMCloudAppConfig` configured to communicate with your IBM Cloud App Configuration service instance. The kind has a shorthand `icappconfig`.

* You can do a describe on your `IBMCloudAppConfig`
    ```
    kubectl describe icappconfig appconfig-set
    ```
* This resource is configured to fetch the values of the feature flags and properties grouped by the collectionId `dev`.
* **The flag and properties values are available to the custom resource with keys pre-fixed with either `flag-` or `prop-`. For eg: a feature flag with id as `nginx-label` will be available as `flag-nginx-label` and a property with the same id will be available as `prop-nginx-label`.**
* As you enable or disable the feature flag in the IBM Cloud App Configuration service console, the corresponding flag values are updated in the `icappconfig` resource. Similarly, changes in the properties values are also updated in the `icappconfig` resource.Hence, all the values are available to the cluster.
* You can change the environmentId specified in the custom resource to the other environments by using the kubectl edit command. The custom resource will be updated with the updated values as soon as the values are modified.
    ```
      kubectl edit icappconfig appconfig-set
    ```
* You can use these flag values with other kubernetes resources using Razee Mustache templates.

## Tutorial

### Controlling kubernetes deployment of resources (ConfigMaps, Deployments etc) with App Configuration Feature Flag #
* Problem Statement: Control number of replicas of a deployment based on the feature flag and on evaluation of the cluster details. A segment of cluster needs to be scaled up for the deployment.
* Create an instance of IBM Cloud App Configuration Service. Create a collecction and feature flags to test for that application. For example, Create a collection with id : `dev`  and feature flags with enabled and disabled values: `nginx-label` (String : public, staging), replica-count (Numeric: 0, 1) for this collection. Also, Create a segment called `StandardCluster` with rule which says when the attribute `cluster-type` is `standard`. For feature flag replica-count, enable targeting with `StandardCluster` segment and override enabled value to 3.
* Now, we need to create few custom resources defined by Razee. Let us use `ManagedSet` to create IBMCloudAppConfig, Deployment, ConfigMap, MustacheTemplate from a single file 
    ```yaml
    kind: ManagedSet
    apiVersion: deploy.razee.io/v1alpha1
    metadata:
      name: appconfig-managed-set
      namespace: default
    spec:
      resources:
        - apiVersion: deploy.razee.io/v1beta1
          kind: IBMCloudAppConfig
          metadata:
            name: appconfig-set
            namespace: default
          spec:
            entityId: "<unique entity id like '123'>"
            region: "us-south"
            guid: "YOUR_INSTANCE_GUID"
            collectionId: "dev"
            environmentId: "dev"
            apikey: "YOUR_API_KEY"
            entityAttributes:
              - name: cluster-type
                value: "standard"
              - name: cluster-version
                value: "1.18"
        - apiVersion: "deploy.razee.io/v1alpha1"
          kind: MustacheTemplate
          metadata:
            name: appconfig-mustache-template
            namespace: default
          spec:
            env:
            - name: replicas
              valueFrom:
                genericKeyRef:
                  apiVersion: deploy.razee.io/v1beta1
                  kind: IBMCloudAppConfig
                  name: appconfig-set
                  key: flag-replica-count
            - name: nginx-label
              valueFrom:
                genericKeyRef:
                  apiVersion: deploy.razee.io/v1beta1
                  kind: IBMCloudAppConfig
                  name: appconfig-set
                  key: prop-nginx-label
            templates:
            - apiVersion: v1
              kind: ConfigMap
              metadata: 
                name: test-config
              data:
                label: "{{ nginx-label }}"
            strTemplates:
            - |
                apiVersion: apps/v1 
                kind: Deployment
                metadata:
                  name: nginx-deployment
                  labels:
                    app: nginx
                    deployment: "{{ nginx-label }}"
                spec:
                  replicas: {{ replicas }}
                  selector:
                    matchLabels:
                      app: nginx
                  template:
                    metadata:
                      labels:
                        app: nginx
                    spec:
                      containers:
                      - name: nginx
                        image: nginx:1.14.2
                        ports:
                        - containerPort: 80
    ```
* Create the above managed set in a standard cluster. The above yaml creates a IBMCloudAppConfig resource with cluster-type attribute as 'standard'. You can create a similar managedset in another cluster (Let us say minikube, with cluster-type attribute as minikube).

    Run the below command to create the managed set.
    ```
    kubectl apply -f managedset.yaml
    ```
* The above command should create multiple custom resources. It should create a IBMCloudAppConfig (with speficied IBM Cloud App Configuration instance name, collection name, environment ID and feature names), for using the feature flag and a deployment object with values provided by the Mustache template.
* Verify that a IBMCloudAppConfig, ManagedSet and Deployment is created. It will take about 3 minutes for the deployment object to get created and updated.

    ```
    kubectl get icappconfig
    kubectl get managedset
    kubectl get configmaps
    kubectl get deployments
    ```
* When the flag is disabled, the deployment should have 0 replicas as specified for the disabled value in the 'replica-count' flag. After enabling the flag, the deployment object will be scaled up to 1 pods in minikube and to 3 pods for the cluster with cluster-name attribute as "standard". It should take three minutes for the Mustache template to update the values.
