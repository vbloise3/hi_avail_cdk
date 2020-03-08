""" 
Make sure you run these commands to setup your environment
pip install paho-mqtt 
pip install requests
pip install appsync-client
pip install aws_cdk.aws_appsync
pip install aws_cdk.aws_iam
pip install aws_cdk.aws_dynamodb

Exercise for lab user: use the 'products' set of queries and load data
into the products table using the suplied GraphQL api. Then aggregate the data
from the Items and Products table in additional resolver code
"""
from aws_cdk import (
    core,
    aws_ec2 as ec2,
    aws_elasticache as elasti
)

from aws_cdk.aws_iam import (
    Role,
    ServicePrincipal,
    ManagedPolicy,
    PolicyStatement
)


class HiAvailCdkStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, *, stack_tag="default", **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # create VPC w/ public and private subnets in 2 AZs
        #     this also creates NAT Gateways in our public subnets
        vpc = ec2.Vpc(
            self, stack_tag,
            max_azs=2,
            cidr="10.10.0.0/16",
            # configuration will create 3 groups in 2 AZs = 6 subnets.
            subnet_configuration=[ec2.SubnetConfiguration(
                subnet_type=ec2.SubnetType.PUBLIC,
                name="Public",
                cidr_mask=24
            ), ec2.SubnetConfiguration(
                subnet_type=ec2.SubnetType.PRIVATE,
                name="Private",
                cidr_mask=24
            ), ec2.SubnetConfiguration(
                subnet_type=ec2.SubnetType.ISOLATED,
                name="DB",
                cidr_mask=24
            )
            ],
            # nat_gateway_provider=ec2.NatProvider.gateway(),
            nat_gateways=2,              
        )

        # Iterate the isolated subnets
        selection = vpc.select_subnets(
            subnet_type=ec2.SubnetType.ISOLATED
        )

        redis_subnet_group = elasti.CfnSubnetGroup(self, 'redis-subnet-group',
            description='The redis subnet group id',
            subnet_ids=selection.subnet_ids,
            cache_subnet_group_name='redis-subnet-group'
        )

        redis_security_group = ec2.SecurityGroup(self, 'redis-security-group', vpc=vpc,
        description="allow access to cluster", allow_all_outbound=True)
        
        redis_connections = ec2.Connections(default_port=ec2.Port.tcp(6379), security_groups=[redis_security_group])

        redis = elasti.CfnCacheCluster(self, "redis-cluster", 
                cache_node_type='cache.t2.micro',
                engine='redis',
                engine_version='5.0.6',
                num_cache_nodes=1,
                port=6379,
                cache_subnet_group_name=redis_subnet_group.cache_subnet_group_name,
                vpc_security_group_ids=[redis_security_group.security_group_id]
                )
        redis.add_depends_on(redis_subnet_group)

        redisUrl = "redis://" + redis.attr_redis_endpoint_address + ":" + redis.attr_redis_endpoint_port
        print(redisUrl)
