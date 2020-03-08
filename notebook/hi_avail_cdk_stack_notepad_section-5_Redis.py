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
from aws_cdk import core

from aws_cdk.aws_iam import (
    Role,
    ServicePrincipal,
    ManagedPolicy,
    PolicyStatement
)


class HiAvailCdkStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, *, stack_tag="default", **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        