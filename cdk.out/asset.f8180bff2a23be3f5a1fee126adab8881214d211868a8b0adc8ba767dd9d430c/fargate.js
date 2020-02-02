"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("./common");
const MAX_NAME_LEN = 63;
class FargateProfileResourceHandler extends common_1.ResourceHandler {
    async onCreate() {
        var _a;
        const fargateProfileName = (_a = this.event.ResourceProperties.Config.fargateProfileName, (_a !== null && _a !== void 0 ? _a : this.generateProfileName()));
        const createFargateProfile = {
            fargateProfileName,
            ...this.event.ResourceProperties.Config
        };
        this.log({ createFargateProfile });
        const createFargateProfileResponse = await this.eks.createFargateProfile(createFargateProfile);
        this.log({ createFargateProfileResponse });
        if (!createFargateProfileResponse.fargateProfile) {
            throw new Error(`invalid CreateFargateProfile response`);
        }
        return {
            PhysicalResourceId: createFargateProfileResponse.fargateProfile.fargateProfileName,
            Data: {
                fargateProfileArn: createFargateProfileResponse.fargateProfile.fargateProfileArn,
            }
        };
    }
    async onDelete() {
        if (!this.physicalResourceId) {
            throw new Error(`Cannot delete a profile without a physical id`);
        }
        const deleteFargateProfile = {
            clusterName: this.event.ResourceProperties.Config.clusterName,
            fargateProfileName: this.physicalResourceId
        };
        this.log({ deleteFargateProfile });
        const deleteFargateProfileResponse = await this.eks.deleteFargateProfile(deleteFargateProfile);
        this.log({ deleteFargateProfileResponse });
        return;
    }
    async onUpdate() {
        // all updates require a replacement. as long as name is generated, we are
        // good. if name is explicit, update will fail, which is common when trying
        // to replace cfn resources with explicit physical names
        return this.onCreate();
    }
    async isCreateComplete() {
        return this.isUpdateComplete();
    }
    async isUpdateComplete() {
        const status = await this.queryStatus();
        return {
            IsComplete: status === 'ACTIVE'
        };
    }
    async isDeleteComplete() {
        const status = await this.queryStatus();
        return {
            IsComplete: status === 'NOT_FOUND'
        };
    }
    /**
     * Generates a fargate profile name.
     */
    generateProfileName() {
        const suffix = this.requestId.replace(/-/g, ''); // 32 chars
        const prefix = this.logicalResourceId.substr(0, MAX_NAME_LEN - suffix.length - 1);
        return `${prefix}-${suffix}`;
    }
    /**
     * Queries the Fargate profile's current status and returns the status or
     * NOT_FOUND if the profile doesn't exist (i.e. it has been deleted).
     */
    async queryStatus() {
        var _a;
        if (!this.physicalResourceId) {
            throw new Error(`Unable to determine status for fargate profile without a resource name`);
        }
        const describeFargateProfile = {
            clusterName: this.event.ResourceProperties.Config.clusterName,
            fargateProfileName: this.physicalResourceId
        };
        try {
            this.log({ describeFargateProfile });
            const describeFargateProfileResponse = await this.eks.describeFargateProfile(describeFargateProfile);
            this.log({ describeFargateProfileResponse });
            const status = (_a = describeFargateProfileResponse.fargateProfile) === null || _a === void 0 ? void 0 : _a.status;
            if (status === 'CREATE_FAILED' || status === 'DELETE_FAILED') {
                throw new Error(status);
            }
            return status;
        }
        catch (describeFargateProfileError) {
            if (describeFargateProfileError.code === 'ResourceNotFoundException') {
                this.log('received ResourceNotFoundException, this means the profile has been deleted (or never existed)');
                return 'NOT_FOUND';
            }
            this.log({ describeFargateProfileError });
            throw describeFargateProfileError;
        }
    }
}
exports.FargateProfileResourceHandler = FargateProfileResourceHandler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFyZ2F0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZhcmdhdGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxxQ0FBMkM7QUFLM0MsTUFBTSxZQUFZLEdBQUcsRUFBRSxDQUFDO0FBRXhCLE1BQWEsNkJBQThCLFNBQVEsd0JBQWU7SUFDdEQsS0FBSyxDQUFDLFFBQVE7O1FBQ3RCLE1BQU0sa0JBQWtCLFNBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLHVDQUFJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxFQUFBLENBQUM7UUFFakgsTUFBTSxvQkFBb0IsR0FBd0M7WUFDaEUsa0JBQWtCO1lBQ2xCLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNO1NBQ3hDLENBQUM7UUFFRixJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sNEJBQTRCLEdBQUcsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDL0YsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLDRCQUE0QixFQUFFLENBQUMsQ0FBQztRQUUzQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsY0FBYyxFQUFFO1lBQ2hELE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQztTQUMxRDtRQUVELE9BQU87WUFDTCxrQkFBa0IsRUFBRSw0QkFBNEIsQ0FBQyxjQUFjLENBQUMsa0JBQWtCO1lBQ2xGLElBQUksRUFBRTtnQkFDSixpQkFBaUIsRUFBRSw0QkFBNEIsQ0FBQyxjQUFjLENBQUMsaUJBQWlCO2FBQ2pGO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFFUyxLQUFLLENBQUMsUUFBUTtRQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFO1lBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsK0NB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QUFDO2dCQUMzRyxPQUFPLFdBQVcsQ0FBQzthQUNwQjtZQUVELElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSwyQkFBMkIsRUFBRSxDQUFDLENBQUM7WUFDMUMsTUFBTSwyQkFBMkIsQ0FBQztTQUNuQztJQUNILENBQUM7Q0FDRjtBQWhIRCxzRUFnSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBSZXNvdXJjZUhhbmRsZXIgfSBmcm9tIFwiLi9jb21tb25cIjtcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIGltcG9ydC9uby1leHRyYW5lb3VzLWRlcGVuZGVuY2llc1xuaW1wb3J0ICogYXMgYXdzIGZyb20gJ2F3cy1zZGsnO1xuXG5jb25zdCBNQVhfTkFNRV9MRU4gPSA2MztcblxuZXhwb3J0IGNsYXNzIEZhcmdhdGVQcm9maWxlUmVzb3VyY2VIYW5kbGVyIGV4dGVuZHMgUmVzb3VyY2VIYW5kbGVyIHtcbiAgcHJvdGVjdGVkIGFzeW5jIG9uQ3JlYXRlKCkge1xuICAgIGNvbnN0IGZhcmdhdGVQcm9maWxlTmFtZSA9IHRoaXMuZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzLkNvbmZpZy5mYXJnYXRlUHJvZmlsZU5hbWUgPz8gdGhpcy5nZW5lcmF0ZVByb2ZpbGVOYW1lKCk7XG5cbiAgICBjb25zdCBjcmVhdGVGYXJnYXRlUHJvZmlsZTogYXdzLkVLUy5DcmVhdGVGYXJnYXRlUHJvZmlsZVJlcXVlc3QgPSB7XG4gICAgICBmYXJnYXRlUHJvZmlsZU5hbWUsXG4gICAgICAuLi50aGlzLmV2ZW50LlJlc291cmNlUHJvcGVydGllcy5Db25maWdcbiAgICB9O1xuXG4gICAgdGhpcy5sb2coeyBjcmVhdGVGYXJnYXRlUHJvZmlsZSB9KTtcbiAgICBjb25zdCBjcmVhdGVGYXJnYXRlUHJvZmlsZVJlc3BvbnNlID0gYXdhaXQgdGhpcy5la3MuY3JlYXRlRmFyZ2F0ZVByb2ZpbGUoY3JlYXRlRmFyZ2F0ZVByb2ZpbGUpO1xuICAgIHRoaXMubG9nKHsgY3JlYXRlRmFyZ2F0ZVByb2ZpbGVSZXNwb25zZSB9KTtcblxuICAgIGlmICghY3JlYXRlRmFyZ2F0ZVByb2ZpbGVSZXNwb25zZS5mYXJnYXRlUHJvZmlsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBpbnZhbGlkIENyZWF0ZUZhcmdhdGVQcm9maWxlIHJlc3BvbnNlYCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIFBoeXNpY2FsUmVzb3VyY2VJZDogY3JlYXRlRmFyZ2F0ZVByb2ZpbGVSZXNwb25zZS5mYXJnYXRlUHJvZmlsZS5mYXJnYXRlUHJvZmlsZU5hbWUsXG4gICAgICBEYXRhOiB7XG4gICAgICAgIGZhcmdhdGVQcm9maWxlQXJuOiBjcmVhdGVGYXJnYXRlUHJvZmlsZVJlc3BvbnNlLmZhcmdhdGVQcm9maWxlLmZhcmdhdGVQcm9maWxlQXJuLFxuICAgICAgfVxuICAgIH07XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgb25EZWxldGUoKSB7XG4gICAgaWYgKCF0aGlzLnBoeXNpY2FsUmVzb3VyY2VJZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDYW5ub3QgZGVsZXRlIGEgcHJvZmlsZSB3aXRob3V0IGEgcGh5c2ljYWwgaWRgKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZWxldGVGYXJnYXRlUHJvZmlsZTogYXdzLkVLUy5EZWxldGVGYXJnYXRlUHJvZmlsZVJlcXVlc3QgPSB7XG4gICAgICBjbHVzdGVyTmFtZTogdGhpcy5ldmVudC5SZXNvdXJjZVByb3BlcnRpZXMuQ29uZmlnLmNsdXN0ZXJOYW1lLFxuICAgICAgZmFyZ2F0ZVByb2ZpbGVOYW1lOiB0aGlzLnBoeXNpY2FsUmVzb3VyY2VJZFxuICAgIH07XG5cbiAgICB0aGlzLmxvZyh7IGRlbGV0ZUZhcmdhdGVQcm9maWxlIH0pO1xuICAgIGNvbnN0IGRlbGV0ZUZhcmdhdGVQcm9maWxlUmVzcG9uc2UgPSBhd2FpdCB0aGlzLmVrcy5kZWxldGVGYXJnYXRlUHJvZmlsZShkZWxldGVGYXJnYXRlUHJvZmlsZSk7XG4gICAgdGhpcy5sb2coeyBkZWxldGVGYXJnYXRlUHJvZmlsZVJlc3BvbnNlIH0pO1xuXG4gICAgcmV0dXJuO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIG9uVXBkYXRlKCkge1xuICAgIC8vIGFsbCB1cGRhdGVzIHJlcXVpcmUgYSByZXBsYWNlbWVudC4gYXMgbG9uZyBhcyBuYW1lIGlzIGdlbmVyYXRlZCwgd2UgYXJlXG4gICAgLy8gZ29vZC4gaWYgbmFtZSBpcyBleHBsaWNpdCwgdXBkYXRlIHdpbGwgZmFpbCwgd2hpY2ggaXMgY29tbW9uIHdoZW4gdHJ5aW5nXG4gICAgLy8gdG8gcmVwbGFjZSBjZm4gcmVzb3VyY2VzIHdpdGggZXhwbGljaXQgcGh5c2ljYWwgbmFtZXNcbiAgICByZXR1cm4gdGhpcy5vbkNyZWF0ZSgpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGlzQ3JlYXRlQ29tcGxldGUoKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNVcGRhdGVDb21wbGV0ZSgpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIGlzVXBkYXRlQ29tcGxldGUoKSB7XG4gICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgdGhpcy5xdWVyeVN0YXR1cygpO1xuICAgIHJldHVybiB7XG4gICAgICBJc0NvbXBsZXRlOiBzdGF0dXMgPT09ICdBQ1RJVkUnXG4gICAgfTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBpc0RlbGV0ZUNvbXBsZXRlKCkge1xuICAgIGNvbnN0IHN0YXR1cyA9IGF3YWl0IHRoaXMucXVlcnlTdGF0dXMoKTtcbiAgICByZXR1cm4ge1xuICAgICAgSXNDb21wbGV0ZTogc3RhdHVzID09PSAnTk9UX0ZPVU5EJ1xuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGVzIGEgZmFyZ2F0ZSBwcm9maWxlIG5hbWUuXG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRlUHJvZmlsZU5hbWUoKSB7XG4gICAgY29uc3Qgc3VmZml4ID0gdGhpcy5yZXF1ZXN0SWQucmVwbGFjZSgvLS9nLCAnJyk7IC8vIDMyIGNoYXJzXG4gICAgY29uc3QgcHJlZml4ID0gdGhpcy5sb2dpY2FsUmVzb3VyY2VJZC5zdWJzdHIoMCwgTUFYX05BTUVfTEVOIC0gc3VmZml4Lmxlbmd0aCAtIDEpO1xuICAgIHJldHVybiBgJHtwcmVmaXh9LSR7c3VmZml4fWA7XG4gIH1cblxuICAvKipcbiAgICogUXVlcmllcyB0aGUgRmFyZ2F0ZSBwcm9maWxlJ3MgY3VycmVudCBzdGF0dXMgYW5kIHJldHVybnMgdGhlIHN0YXR1cyBvclxuICAgKiBOT1RfRk9VTkQgaWYgdGhlIHByb2ZpbGUgZG9lc24ndCBleGlzdCAoaS5lLiBpdCBoYXMgYmVlbiBkZWxldGVkKS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcXVlcnlTdGF0dXMoKTogUHJvbWlzZTxhd3MuRUtTLkZhcmdhdGVQcm9maWxlU3RhdHVzIHwgJ05PVF9GT1VORCcgfCB1bmRlZmluZWQ+IHtcbiAgICBpZiAoIXRoaXMucGh5c2ljYWxSZXNvdXJjZUlkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFVuYWJsZSB0byBkZXRlcm1pbmUgc3RhdHVzIGZvciBmYXJnYXRlIHByb2ZpbGUgd2l0aG91dCBhIHJlc291cmNlIG5hbWVgKTtcbiAgICB9XG5cbiAgICBjb25zdCBkZXNjcmliZUZhcmdhdGVQcm9maWxlOiBhd3MuRUtTLkRlc2NyaWJlRmFyZ2F0ZVByb2ZpbGVSZXF1ZXN0ID0ge1xuICAgICAgY2x1c3Rlck5hbWU6IHRoaXMuZXZlbnQuUmVzb3VyY2VQcm9wZXJ0aWVzLkNvbmZpZy5jbHVzdGVyTmFtZSxcbiAgICAgIGZhcmdhdGVQcm9maWxlTmFtZTogdGhpcy5waHlzaWNhbFJlc291cmNlSWRcbiAgICB9O1xuXG4gICAgdHJ5IHtcblxuICAgICAgdGhpcy5sb2coeyBkZXNjcmliZUZhcmdhdGVQcm9maWxlIH0pO1xuICAgICAgY29uc3QgZGVzY3JpYmVGYXJnYXRlUHJvZmlsZVJlc3BvbnNlID0gYXdhaXQgdGhpcy5la3MuZGVzY3JpYmVGYXJnYXRlUHJvZmlsZShkZXNjcmliZUZhcmdhdGVQcm9maWxlKTtcbiAgICAgIHRoaXMubG9nKHsgZGVzY3JpYmVGYXJnYXRlUHJvZmlsZVJlc3BvbnNlIH0pO1xuICAgICAgY29uc3Qgc3RhdHVzID0gZGVzY3JpYmVGYXJnYXRlUHJvZmlsZVJlc3BvbnNlLmZhcmdhdGVQcm9maWxlPy5zdGF0dXM7XG5cbiAgICAgIGlmIChzdGF0dXMgPT09ICdDUkVBVEVfRkFJTEVEJyB8fCBzdGF0dXMgPT09ICdERUxFVEVfRkFJTEVEJykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3Ioc3RhdHVzKTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHN0YXR1cztcbiAgICB9IGNhdGNoIChkZXNjcmliZUZhcmdhdGVQcm9maWxlRXJyb3IpIHtcbiAgICAgIGlmIChkZXNjcmliZUZhcmdhdGVQcm9maWxlRXJyb3IuY29kZSA9PT0gJ1Jlc291cmNlTm90Rm91bmRFeGNlcHRpb24nKSB7XG4gICAgICAgIHRoaXMubG9nKCdyZWNlaXZlZCBSZXNvdXJjZU5vdEZvdW5kRXhjZXB0aW9uLCB0aGlzIG1lYW5zIHRoZSBwcm9maWxlIGhhcyBiZWVuIGRlbGV0ZWQgKG9yIG5ldmVyIGV4aXN0ZWQpJyk7XG4gICAgICAgIHJldHVybiAnTk9UX0ZPVU5EJztcbiAgICAgIH1cblxuICAgICAgdGhpcy5sb2coeyBkZXNjcmliZUZhcmdhdGVQcm9maWxlRXJyb3IgfSk7XG4gICAgICB0aHJvdyBkZXNjcmliZUZhcmdhdGVQcm9maWxlRXJyb3I7XG4gICAgfVxuICB9XG59Il19