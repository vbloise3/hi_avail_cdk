"use strict";
// tslint:disable:no-console
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
const MAX_CLUSTER_NAME_LEN = 100;
class ClusterResourceHandler extends common_1.ResourceHandler {
    constructor(eks, event) {
        super(eks, event);
        this.newProps = parseProps(this.event.ResourceProperties);
        this.oldProps = event.RequestType === 'Update' ? parseProps(event.OldResourceProperties) : {};
    }
    get clusterName() {
        if (!this.physicalResourceId) {
            throw new Error(`Cannot determine cluster name without physical resource ID`);
        }
        return this.physicalResourceId;
    }
    // ------
    // CREATE
    // ------
    async onCreate() {
        console.log('onCreate: creating cluster with options:', JSON.stringify(this.newProps, undefined, 2));
        if (!this.newProps.roleArn) {
            throw new Error('"roleArn" is required');
        }
        const clusterName = this.newProps.name || this.generateClusterName();
        const resp = await this.eks.createCluster({
            ...this.newProps,
            name: clusterName,
        });
        if (!resp.cluster) {
            throw new Error(`Error when trying to create cluster ${clusterName}: CreateCluster returned without cluster information`);
        }
        return {
            PhysicalResourceId: resp.cluster.name
        };
    }
    async isCreateComplete() {
        return this.isActive();
    }
    // ------
    // DELETE
    // ------
    async onDelete() {
        console.log(`onDelete: deleting cluster ${this.clusterName}`);
        try {
            await this.eks.deleteCluster({ name: this.clusterName });
        }
        catch (e) {
            if (e.code !== 'ResourceNotFoundException') {
                throw e;
            }
            else {
                console.log(`cluster ${this.clusterName} not found, idempotently succeeded`);
            }
        }
        return {
            PhysicalResourceId: this.clusterName
        };
    }
    async isDeleteComplete() {
        console.log(`isDeleteComplete: waiting for cluster ${this.clusterName} to be deleted`);
        try {
            const resp = await this.eks.describeCluster({ name: this.clusterName });
            console.log('describeCluster returned:', JSON.stringify(resp, undefined, 2));
        }
        catch (e) {
            if (e.code === 'ResourceNotFoundException') {
                console.log('received ResourceNotFoundException, this means the cluster has been deleted (or never existed)');
                return { IsComplete: true };
            }
            console.log('describeCluster error:', e);
            throw e;
        }
        return {
            IsComplete: false
        };
    }
    // ------
    // UPDATE
    // ------
    async onUpdate() {
        const updates = analyzeUpdate(this.oldProps, this.newProps);
        console.log(`onUpdate:`, JSON.stringify({ updates }, undefined, 2));
        // if there is an update that requires replacement, go ahead and just create
        // a new cluster with the new config. The old cluster will automatically be
        // deleted by cloudformation upon success.
        if (updates.replaceName || updates.replaceRole || updates.replaceVpc) {
            // if we are replacing this cluster and the cluster has an explicit
            // physical name, the creation of the new cluster will fail with "there is
            // already a cluster with that name". this is a common behavior for
            // CloudFormation resources that support specifying a physical name.
            if (this.oldProps.name === this.newProps.name && this.oldProps.name) {
                throw new Error(`Cannot replace cluster "${this.oldProps.name}" since it has an explicit physical name. Either rename the cluster or remove the "name" configuration`);
            }
            return await this.onCreate();
        }
        // if a version update is required, issue the version update
        if (updates.updateVersion) {
            if (!this.newProps.version) {
                throw new Error(`Cannot remove cluster version configuration. Current version is ${this.oldProps.version}`);
            }
            await this.updateClusterVersion(this.newProps.version);
        }
        if (updates.updateLogging || updates.updateAccess) {
            await this.eks.updateClusterConfig({
                name: this.clusterName,
                logging: this.newProps.logging,
                resourcesVpcConfig: this.newProps.resourcesVpcConfig
            });
        }
        // no updates
        return;
    }
    async isUpdateComplete() {
        console.log(`isUpdateComplete`);
        return this.isActive();
    }
    async updateClusterVersion(newVersion) {
        var _a;
        console.log(`updating cluster version to ${newVersion}`);
        // update-cluster-version will fail if we try to update to the same version,
        // so skip in this case.
        const cluster = (await this.eks.describeCluster({ name: this.clusterName })).cluster;
        if (((_a = cluster) === null || _a === void 0 ? void 0 : _a.version) === newVersion) {
            console.log(`cluster already at version ${cluster.version}, skipping version update`);
            return;
        }
        await this.eks.updateClusterVersion({ name: this.clusterName, version: newVersion });
    }
    async isActive() {
        var _a, _b;
        console.log('waiting for cluster to become ACTIVE');
        const resp = await this.eks.describeCluster({ name: this.clusterName });
        console.log('describeCluster result:', JSON.stringify(resp, undefined, 2));
        const cluster = resp.cluster;
        // if cluster is undefined (shouldnt happen) or status is not ACTIVE, we are
        // not complete. note that the custom resource provider framework forbids
        // returning attributes (Data) if isComplete is false.
        if (((_a = cluster) === null || _a === void 0 ? void 0 : _a.status) !== 'ACTIVE') {
            return {
                IsComplete: false
            };
        }
        else {
            return {
                IsComplete: true,
                Data: {
                    Name: cluster.name,
                    Endpoint: cluster.endpoint,
                    Arn: cluster.arn,
                    CertificateAuthorityData: (_b = cluster.certificateAuthority) === null || _b === void 0 ? void 0 : _b.data
                }
            };
        }
    }
    generateClusterName() {
        const suffix = this.requestId.replace(/-/g, ''); // 32 chars
        const prefix = this.logicalResourceId.substr(0, MAX_CLUSTER_NAME_LEN - suffix.length - 1);
        return `${prefix}-${suffix}`;
    }
}
exports.ClusterResourceHandler = ClusterResourceHandler;
function parseProps(props) {
    var _a, _b;
    return _b = (_a = props) === null || _a === void 0 ? void 0 : _a.Config, (_b !== null && _b !== void 0 ? _b : {});
}
function analyzeUpdate(oldProps, newProps) {
    console.log('old props: ', JSON.stringify(oldProps));
    console.log('new props: ', JSON.stringify(newProps));
    const newVpcProps = newProps.resourcesVpcConfig || {};
    const oldVpcProps = oldProps.resourcesVpcConfig || {};
    return {
        replaceName: newProps.name !== oldProps.name,
        replaceVpc: JSON.stringify(newVpcProps.subnetIds) !== JSON.stringify(oldVpcProps.subnetIds) ||
            JSON.stringify(newVpcProps.securityGroupIds) !== JSON.stringify(oldVpcProps.securityGroupIds),
        updateAccess: newVpcProps.endpointPrivateAccess !== oldVpcProps.endpointPrivateAccess ||
            newVpcProps.endpointPublicAccess !== oldVpcProps.endpointPublicAccess,
        replaceRole: newProps.roleArn !== oldProps.roleArn,
        updateVersion: newProps.version !== oldProps.version,
        updateLogging: JSON.stringify(newProps.logging) !== JSON.stringify(oldProps.logging),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2x1c3Rlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNsdXN0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDRCQUE0Qjs7QUFLNUIscUNBQXNEO0FBRXRELE1BQU0sb0JBQW9CLEdBQUcsR0FBRyxDQUFDO0FBRWpDLE1BQWEsc0JBQXVCLFNBQVEsd0JBQWU7SUFZekQsWUFBWSxHQUFjLEVBQUUsS0FBa0Q7UUFDNUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVsQixJQUFJLENBQUMsUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDMUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUMsV0FBVyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFHLENBQUM7SUFDakcsQ0FBQztJQWhCRCxJQUFXLFdBQVc7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRTtZQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLDREQUE0RCxDQUFDLENBQUM7U0FDL0U7UUFFRCxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQztJQUNqQyxDQUFDO0lBWUQsU0FBUztJQUNULFNBQVM7SUFDVCxTQUFTO0lBRUMsS0FBSyxDQUFDLFFBQVE7UUFDdEIsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQ0FBMEMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckcsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFO1lBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQztTQUMxQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMs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QyxJQUFJLEtBQUssUUFBUSxDQUFDLElBQUk7UUFDNUMsVUFBVSxFQUNSLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQztZQUMvRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDO1FBQy9GLFlBQVksRUFDVixXQUFXLENBQUMscUJBQXFCLEtBQUssV0FBVyxDQUFDLHFCQUFxQjtZQUN2RSxXQUFXLENBQUMsb0JBQW9CLEtBQUssV0FBVyxDQUFDLG9CQUFvQjtRQUN2RSxXQUFXLEVBQUUsUUFBUSxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMsT0FBTztRQUNsRCxhQUFhLEVBQUUsUUFBUSxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMsT0FBTztRQUNwRCxhQUFhLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0tBQ3JGLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6bm8tY29uc29sZVxuXG5pbXBvcnQgeyBJc0NvbXBsZXRlUmVzcG9uc2UsIE9uRXZlbnRSZXNwb25zZSB9IGZyb20gJ0Bhd3MtY2RrL2N1c3RvbS1yZXNvdXJjZXMvbGliL3Byb3ZpZGVyLWZyYW1ld29yay90eXBlcyc7XG4vLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgaW1wb3J0L25vLWV4dHJhbmVvdXMtZGVwZW5kZW5jaWVzXG5pbXBvcnQgKiBhcyBhd3MgZnJvbSAnYXdzLXNkayc7XG5pbXBvcnQgeyBFa3NDbGllbnQsIFJlc291cmNlSGFuZGxlciB9IGZyb20gJy4vY29tbW9uJztcblxuY29uc3QgTUFYX0NMVVNURVJfTkFNRV9MRU4gPSAxMDA7XG5cbmV4cG9ydCBjbGFzcyBDbHVzdGVyUmVzb3VyY2VIYW5kbGVyIGV4dGVuZHMgUmVzb3VyY2VIYW5kbGVyIHtcbiAgcHVibGljIGdldCBjbHVzdGVyTmFtZSgpIHtcbiAgICBpZiAoIXRoaXMucGh5c2ljYWxSZXNvdXJjZUlkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCBkZXRlcm1pbmUgY2x1c3RlciBuYW1lIHdpdGhvdXQgcGh5c2ljYWwgcmVzb3VyY2UgSURgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5waHlzaWNhbFJlc291cmNlSWQ7XG4gIH1cblxuICBwcml2YXRlIHJlYWRvbmx5IG5ld1Byb3BzOiBhd3MuRUtTLkNyZWF0ZUNsdXN0ZXJSZXF1ZXN0O1xuICBwcml2YXRlIHJlYWRvbmx5IG9sZFByb3BzOiBQYXJ0aWFsPGF3cy5FS1MuQ3JlYXRlQ2x1c3RlclJlcXVlc3Q+O1xuXG4gIGNvbnN0cnVjdG9yKGVrczogRWtzQ2xpZW50LCBldmVudDogQVdTTGFtYmRhLkNsb3VkRm9ybWF0aW9uQ3VzdG9tUmVzb3VyY2VFdmVudCkge1xuICAgIHN1cGVyKGVrcywgZXZlbnQpO1xuXG4gICAgdGhpcy5uZXdQcm9wcyA9IHBhcnNlUHJvcHModGhpcy5ldmVudC5SZXNvdXJjZVByb3BlcnRpZXMpO1xuICAgIHRoaXMub2xkUHJvcHMgPSBldmVudC5SZXF1ZXN0VHlwZSA9PT0gJ1VwZGF0ZScgPyBwYXJzZVByb3BzKGV2ZW50Lk9sZFJlc291cmNlUHJvcGVydGllcykgOiB7IH07XG4gIH1cblxuICAvLyAtLS0tLS1cbiAgLy8gQ1JFQVRFXG4gIC8vIC0tLS0tLVxuXG4gIHByb3RlY3RlZCBhc3luYyBvbkNyZWF0ZSgpOiBQcm9taXNlPE9uRXZlbnRSZXNwb25zZT4ge1xuICAgIGNvbnNvbGUubG9nKCdvbkNyZWF0ZTogY3JlYXRpbmcgY2x1c3RlciB3aXRoIG9wdGlvbnM6JywgSlNPTi5zdHJpbmdpZnkodGhpcy5uZXdQcm9wcywgdW5kZWZpbmVkLCAyKSk7XG4gICAgaWYgKCF0aGlzLm5ld1Byb3BzLnJvbGVBcm4pIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignXCJyb2xlQXJuXCIgaXMgcmVxdWlyZWQnKTtcbiAgICB9XG5cbiAgICBjb25zdCBjbHVzdGVyTmFtZSA9IHRoaXMubmV3UHJvcHMubmFtZSB8fCB0aGlzLmdlbmVyYXRlQ2x1c3Rlck5hbWUoKTtcblxuICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLmVrcy5jcmVhdGVDbHVzdGVyKHtcbiAgICAgIC4uLnRoaXMubmV3UHJvcHMsXG4gICAgICBuYW1lOiBjbHVzdGVyTmFtZSxcbiAgICB9KTtcblxuICAgIGlmICghcmVzcC5jbHVzdGVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEVycm9yIHdoZW4gdHJ5aW5nIHRvIGNyZWF0ZSBjbHVzdGVyICR7Y2x1c3Rlck5hbWV9OiBDcmVhdGVDbHVzdGVyIHJldHVybmVkIHdpdGhvdXQgY2x1c3RlciBpbmZvcm1hdGlvbmApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBQaHlzaWNhbFJlc291cmNlSWQ6IHJlc3AuY2x1c3Rlci5uYW1lXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBpc0NyZWF0ZUNvbXBsZXRlKCkge1xuICAgIHJldHVybiB0aGlzLmlzQWN0aXZlKCk7XG4gIH1cblxuICAvLyAtLS0tLS1cbiAgLy8gREVMRVRFXG4gIC8vIC0tLS0tLVxuXG4gIHByb3RlY3RlZCBhc3luYyBvbkRlbGV0ZSgpOiBQcm9taXNlPE9uRXZlbnRSZXNwb25zZT4ge1xuICAgIGNvbnNvbGUubG9nKGBvbkRlbGV0ZTogZGVsZXRpbmcgY2x1c3RlciAke3RoaXMuY2x1c3Rlck5hbWV9YCk7XG4gICAgdHJ5IHtcbiAgICAgIGF3YWl0IHRoaXMuZWtzLmRlbGV0ZUNsdXN0ZXIoeyBuYW1lOiB0aGlzLmNsdXN0ZXJOYW1lIH0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChlLmNvZGUgIT09ICdSZXNvdXJjZU5vdEZvdW5kRXhjZXB0aW9uJykge1xuICAgICAgICB0aHJvdyBlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5sb2coYGNsdXN0ZXIgJHt0aGlzLmNsdXN0ZXJOYW1lfSBub3QgZm91bmQsIGlkZW1wb3RlbnRseSBzdWNjZWVkZWRgKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogdGhpcy5jbHVzdGVyTmFtZVxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgaXNEZWxldGVDb21wbGV0ZSgpOiBQcm9taXNlPElzQ29tcGxldGVSZXNwb25zZT4ge1xuICAgIGNvbnNvbGUubG9nKGBpc0RlbGV0ZUNvbXBsZXRlOiB3YWl0aW5nIGZvciBjbHVzdGVyICR7dGhpcy5jbHVzdGVyTmFtZX0gdG8gYmUgZGVsZXRlZGApO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLmVrcy5kZXNjcmliZUNsdXN0ZXIoeyBuYW1lOiB0aGlzLmNsdXN0ZXJOYW1lIH0pO1xuICAgICAgY29uc29sZS5sb2coJ2Rlc2NyaWJlQ2x1c3RlciByZXR1cm5lZDonLCBKU09OLnN0cmluZ2lmeShyZXNwLCB1bmRlZmluZWQsIDIpKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAoZS5jb2RlID09PSAnUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvbicpIHtcbiAgICAgICAgY29uc29sZS5sb2coJ3JlY2VpdmVkIFJlc291cmNlTm90Rm91bmRFeGNlcHRpb24sIHRoaXMgbWVhbnMgdGhlIGNsdXN0ZXIgaGFzIGJlZW4gZGVsZXRlZCAob3IgbmV2ZXIgZXhpc3RlZCknKTtcbiAgICAgICAgcmV0dXJuIHsgSXNDb21wbGV0ZTogdHJ1ZSB9O1xuICAgICAgfVxuXG4gICAgICBjb25zb2xlLmxvZygnZGVzY3JpYmVDbHVzdGVyIGVycm9yOicsIGUpO1xuICAgICAgdGhyb3cgZTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgSXNDb21wbGV0ZTogZmFsc2VcbiAgICB9O1xuICB9XG5cbiAgLy8gLS0tLS0tXG4gIC8vIFVQREFURVxuICAvLyAtLS0tLS1cblxuICBwcm90ZWN0ZWQgYXN5bmMgb25VcGRhdGUoKSB7XG4gICAgY29uc3QgdXBkYXRlcyA9IGFuYWx5emVVcGRhdGUodGhpcy5vbGRQcm9wcywgdGhpcy5uZXdQcm9wcyk7XG4gICAgY29uc29sZS5sb2coYG9uVXBkYXRlOmAsIEpTT04uc3RyaW5naWZ5KHsgdXBkYXRlcyB9LCB1bmRlZmluZWQsIDIpKTtcblxuICAgIC8vIGlmIHRoZXJlIGlzIGFuIHVwZGF0ZSB0aGF0IHJlcXVpcmVzIHJlcGxhY2VtZW50LCBnbyBhaGVhZCBhbmQganVzdCBjcmVhdGVcbiAgICAvLyBhIG5ldyBjbHVzdGVyIHdpdGggdGhlIG5ldyBjb25maWcuIFRoZSBvbGQgY2x1c3RlciB3aWxsIGF1dG9tYXRpY2FsbHkgYmVcbiAgICAvLyBkZWxldGVkIGJ5IGNsb3VkZm9ybWF0aW9uIHVwb24gc3VjY2Vzcy5cbiAgICBpZiAodXBkYXRlcy5yZXBsYWNlTmFtZSB8fCB1cGRhdGVzLnJlcGxhY2VSb2xlIHx8IHVwZGF0ZXMucmVwbGFjZVZwYykge1xuXG4gICAgICAvLyBpZiB3ZSBhcmUgcmVwbGFjaW5nIHRoaXMgY2x1c3RlciBhbmQgdGhlIGNsdXN0ZXIgaGFzIGFuIGV4cGxpY2l0XG4gICAgICAvLyBwaHlzaWNhbCBuYW1lLCB0aGUgY3JlYXRpb24gb2YgdGhlIG5ldyBjbHVzdGVyIHdpbGwgZmFpbCB3aXRoIFwidGhlcmUgaXNcbiAgICAgIC8vIGFscmVhZHkgYSBjbHVzdGVyIHdpdGggdGhhdCBuYW1lXCIuIHRoaXMgaXMgYSBjb21tb24gYmVoYXZpb3IgZm9yXG4gICAgICAvLyBDbG91ZEZvcm1hdGlvbiByZXNvdXJjZXMgdGhhdCBzdXBwb3J0IHNwZWNpZnlpbmcgYSBwaHlzaWNhbCBuYW1lLlxuICAgICAgaWYgKHRoaXMub2xkUHJvcHMubmFtZSA9PT0gdGhpcy5uZXdQcm9wcy5uYW1lICYmIHRoaXMub2xkUHJvcHMubmFtZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZXBsYWNlIGNsdXN0ZXIgXCIke3RoaXMub2xkUHJvcHMubmFtZX1cIiBzaW5jZSBpdCBoYXMgYW4gZXhwbGljaXQgcGh5c2ljYWwgbmFtZS4gRWl0aGVyIHJlbmFtZSB0aGUgY2x1c3RlciBvciByZW1vdmUgdGhlIFwibmFtZVwiIGNvbmZpZ3VyYXRpb25gKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMub25DcmVhdGUoKTtcbiAgICB9XG5cbiAgICAvLyBpZiBhIHZlcnNpb24gdXBkYXRlIGlzIHJlcXVpcmVkLCBpc3N1ZSB0aGUgdmVyc2lvbiB1cGRhdGVcbiAgICBpZiAodXBkYXRlcy51cGRhdGVWZXJzaW9uKSB7XG4gICAgICBpZiAoIXRoaXMubmV3UHJvcHMudmVyc2lvbikge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCByZW1vdmUgY2x1c3RlciB2ZXJzaW9uIGNvbmZpZ3VyYXRpb24uIEN1cnJlbnQgdmVyc2lvbiBpcyAke3RoaXMub2xkUHJvcHMudmVyc2lvbn1gKTtcbiAgICAgIH1cblxuICAgICAgYXdhaXQgdGhpcy51cGRhdGVDbHVzdGVyVmVyc2lvbih0aGlzLm5ld1Byb3BzLnZlcnNpb24pO1xuICAgIH1cblxuICAgIGlmICh1cGRhdGVzLnVwZGF0ZUxvZ2dpbmcgfHwgdXBkYXRlcy51cGRhdGVBY2Nlc3MpIHtcbiAgICAgIGF3YWl0IHRoaXMuZWtzLnVwZGF0ZUNsdXN0ZXJDb25maWcoe1xuICAgICAgICBuYW1lOiB0aGlzLmNsdXN0ZXJOYW1lLFxuICAgICAgICBsb2dnaW5nOiB0aGlzLm5ld1Byb3BzLmxvZ2dpbmcsXG4gICAgICAgIHJlc291cmNlc1ZwY0NvbmZpZzogdGhpcy5uZXdQcm9wcy5yZXNvdXJjZXNWcGNDb25maWdcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIG5vIHVwZGF0ZXNcbiAgICByZXR1cm47XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgaXNVcGRhdGVDb21wbGV0ZSgpIHtcbiAgICBjb25zb2xlLmxvZyhgaXNVcGRhdGVDb21wbGV0ZWApO1xuICAgIHJldHVybiB0aGlzLmlzQWN0aXZlKCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHVwZGF0ZUNsdXN0ZXJWZXJzaW9uKG5ld1ZlcnNpb246IHN0cmluZykge1xuICAgIGNvbnNvbGUubG9nKGB1cGRhdGluZyBjbHVzdGVyIHZlcnNpb24gdG8gJHtuZXdWZXJzaW9ufWApO1xuXG4gICAgLy8gdXBkYXRlLWNsdXN0ZXItdmVyc2lvbiB3aWxsIGZhaWwgaWYgd2UgdHJ5IHRvIHVwZGF0ZSB0byB0aGUgc2FtZSB2ZXJzaW9uLFxuICAgIC8vIHNvIHNraXAgaW4gdGhpcyBjYXNlLlxuICAgIGNvbnN0IGNsdXN0ZXIgPSAoYXdhaXQgdGhpcy5la3MuZGVzY3JpYmVDbHVzdGVyKHsgbmFtZTogdGhpcy5jbHVzdGVyTmFtZSB9KSkuY2x1c3RlcjtcbiAgICBpZiAoY2x1c3Rlcj8udmVyc2lvbiA9PT0gbmV3VmVyc2lvbikge1xuICAgICAgY29uc29sZS5sb2coYGNsdXN0ZXIgYWxyZWFkeSBhdCB2ZXJzaW9uICR7Y2x1c3Rlci52ZXJzaW9ufSwgc2tpcHBpbmcgdmVyc2lvbiB1cGRhdGVgKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBhd2FpdCB0aGlzLmVrcy51cGRhdGVDbHVzdGVyVmVyc2lvbih7IG5hbWU6IHRoaXMuY2x1c3Rlck5hbWUsIHZlcnNpb246IG5ld1ZlcnNpb24gfSk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGlzQWN0aXZlKCk6IFByb21pc2U8SXNDb21wbGV0ZVJlc3BvbnNlPiB7XG4gICAgY29uc29sZS5sb2coJ3dhaXRpbmcgZm9yIGNsdXN0ZXIgdG8gYmVjb21lIEFDVElWRScpO1xuICAgIGNvbnN0IHJlc3AgPSBhd2FpdCB0aGlzLmVrcy5kZXNjcmliZUNsdXN0ZXIoeyBuYW1lOiB0aGlzLmNsdXN0ZXJOYW1lIH0pO1xuICAgIGNvbnNvbGUubG9nKCdkZXNjcmliZUNsdXN0ZXIgcmVzdWx0OicsIEpTT04uc3RyaW5naWZ5KHJlc3AsIHVuZGVmaW5lZCwgMikpO1xuICAgIGNvbnN0IGNsdXN0ZXIgPSByZXNwLmNsdXN0ZXI7XG5cbiAgICAvLyBpZiBjbHVzdGVyIGlzIHVuZGVmaW5lZCAoc2hvdWxkbnQgaGFwcGVuKSBvciBzdGF0dXMgaXMgbm90IEFDVElWRSwgd2UgYXJlXG4gICAgLy8gbm90IGNvbXBsZXRlLiBub3RlIHRoYXQgdGhlIGN1c3RvbSByZXNvdXJjZSBwcm92aWRlciBmcmFtZXdvcmsgZm9yYmlkc1xuICAgIC8vIHJldHVybmluZyBhdHRyaWJ1dGVzIChEYXRhKSBpZiBpc0NvbXBsZXRlIGlzIGZhbHNlLlxuICAgIGlmIChjbHVzdGVyPy5zdGF0dXMgIT09ICdBQ1RJVkUnKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBJc0NvbXBsZXRlOiBmYWxzZVxuICAgICAgfTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgSXNDb21wbGV0ZTogdHJ1ZSxcbiAgICAgICAgRGF0YToge1xuICAgICAgICAgIE5hbWU6IGNsdXN0ZXIubmFtZSxcbiAgICAgICAgICBFbmRwb2ludDogY2x1c3Rlci5lbmRwb2ludCxcbiAgICAgICAgICBBcm46IGNsdXN0ZXIuYXJuLFxuICAgICAgICAgIENlcnRpZmljYXRlQXV0aG9yaXR5RGF0YTogY2x1c3Rlci5jZXJ0aWZpY2F0ZUF1dGhvcml0eT8uZGF0YVxuICAgICAgICB9XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2VuZXJhdGVDbHVzdGVyTmFtZSgpIHtcbiAgICBjb25zdCBzdWZmaXggPSB0aGlzLnJlcXVlc3RJZC5yZXBsYWNlKC8tL2csICcnKTsgLy8gMzIgY2hhcnNcbiAgICBjb25zdCBwcmVmaXggPSB0aGlzLmxvZ2ljYWxSZXNvdXJjZUlkLnN1YnN0cigwLCBNQVhfQ0xVU1RFUl9OQU1FX0xFTiAtIHN1ZmZpeC5sZW5ndGggLSAxKTtcbiAgICByZXR1cm4gYCR7cHJlZml4fS0ke3N1ZmZpeH1gO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlUHJvcHMocHJvcHM6IGFueSk6IGF3cy5FS1MuQ3JlYXRlQ2x1c3RlclJlcXVlc3Qge1xuICByZXR1cm4gcHJvcHM/LkNvbmZpZyA/PyB7IH07XG59XG5cbmludGVyZmFjZSBVcGRhdGVNYXAge1xuICByZXBsYWNlTmFtZTogYm9vbGVhbjsgICAgIC8vIG5hbWVcbiAgcmVwbGFjZVZwYzogYm9vbGVhbjsgICAgICAvLyByZXNvdXJjZXNWcGNDb25maWcuc3VibmV0SWRzIGFuZCBzZWN1cml0eUdyb3VwSWRzXG4gIHJlcGxhY2VSb2xlOiBib29sZWFuOyAgICAgLy8gcm9sZUFyblxuICB1cGRhdGVWZXJzaW9uOiBib29sZWFuOyAgIC8vIHZlcnNpb25cbiAgdXBkYXRlTG9nZ2luZzogYm9vbGVhbjsgICAvLyBsb2dnaW5nXG4gIHVwZGF0ZUFjY2VzczogYm9vbGVhbjsgICAgLy8gcmVzb3VyY2VzVnBjQ29uZmlnLmVuZHBvaW50UHJpdmF0ZUFjY2VzcyBhbmQgZW5kcG9pbnRQdWJsaWNBY2Nlc3Ncbn1cblxuZnVuY3Rpb24gYW5hbHl6ZVVwZGF0ZShvbGRQcm9wczogUGFydGlhbDxhd3MuRUtTLkNyZWF0ZUNsdXN0ZXJSZXF1ZXN0PiwgbmV3UHJvcHM6IGF3cy5FS1MuQ3JlYXRlQ2x1c3RlclJlcXVlc3QpOiBVcGRhdGVNYXAge1xuICBjb25zb2xlLmxvZygnb2xkIHByb3BzOiAnLCBKU09OLnN0cmluZ2lmeShvbGRQcm9wcykpO1xuICBjb25zb2xlLmxvZygnbmV3IHByb3BzOiAnLCBKU09OLnN0cmluZ2lmeShuZXdQcm9wcykpO1xuXG4gIGNvbnN0IG5ld1ZwY1Byb3BzID0gbmV3UHJvcHMucmVzb3VyY2VzVnBjQ29uZmlnIHx8IHsgfTtcbiAgY29uc3Qgb2xkVnBjUHJvcHMgPSBvbGRQcm9wcy5yZXNvdXJjZXNWcGNDb25maWcgfHwgeyB9O1xuXG4gIHJldHVybiB7XG4gICAgcmVwbGFjZU5hbWU6IG5ld1Byb3BzLm5hbWUgIT09IG9sZFByb3BzLm5hbWUsXG4gICAgcmVwbGFjZVZwYzpcbiAgICAgIEpTT04uc3RyaW5naWZ5KG5ld1ZwY1Byb3BzLnN1Ym5ldElkcykgIT09IEpTT04uc3RyaW5naWZ5KG9sZFZwY1Byb3BzLnN1Ym5ldElkcykgfHxcbiAgICAgIEpTT04uc3RyaW5naWZ5KG5ld1ZwY1Byb3BzLnNlY3VyaXR5R3JvdXBJZHMpICE9PSBKU09OLnN0cmluZ2lmeShvbGRWcGNQcm9wcy5zZWN1cml0eUdyb3VwSWRzKSxcbiAgICB1cGRhdGVBY2Nlc3M6XG4gICAgICBuZXdWcGNQcm9wcy5lbmRwb2ludFByaXZhdGVBY2Nlc3MgIT09IG9sZFZwY1Byb3BzLmVuZHBvaW50UHJpdmF0ZUFjY2VzcyB8fFxuICAgICAgbmV3VnBjUHJvcHMuZW5kcG9pbnRQdWJsaWNBY2Nlc3MgIT09IG9sZFZwY1Byb3BzLmVuZHBvaW50UHVibGljQWNjZXNzLFxuICAgIHJlcGxhY2VSb2xlOiBuZXdQcm9wcy5yb2xlQXJuICE9PSBvbGRQcm9wcy5yb2xlQXJuLFxuICAgIHVwZGF0ZVZlcnNpb246IG5ld1Byb3BzLnZlcnNpb24gIT09IG9sZFByb3BzLnZlcnNpb24sXG4gICAgdXBkYXRlTG9nZ2luZzogSlNPTi5zdHJpbmdpZnkobmV3UHJvcHMubG9nZ2luZykgIT09IEpTT04uc3RyaW5naWZ5KG9sZFByb3BzLmxvZ2dpbmcpLFxuICB9O1xufVxuIl19