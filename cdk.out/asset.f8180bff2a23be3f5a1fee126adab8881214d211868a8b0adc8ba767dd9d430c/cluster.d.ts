import { IsCompleteResponse, OnEventResponse } from '@aws-cdk/custom-resources/lib/provider-framework/types';
import { EksClient, ResourceHandler } from './common';
export declare class ClusterResourceHandler extends ResourceHandler {
    get clusterName(): string;
    private readonly newProps;
    private readonly oldProps;
    constructor(eks: EksClient, event: AWSLambda.CloudFormationCustomResourceEvent);
    protected onCreate(): Promise<OnEventResponse>;
    protected isCreateComplete(): Promise<IsCompleteResponse>;
    protected onDelete(): Promise<OnEventResponse>;
    protected isDeleteComplete(): Promise<IsCompleteResponse>;
    protected onUpdate(): Promise<OnEventResponse | undefined>;
    protected isUpdateComplete(): Promise<IsCompleteResponse>;
    private updateClusterVersion;
    private isActive;
    private generateClusterName;
}
