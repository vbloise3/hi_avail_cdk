from aws_cdk import (
    aws_ec2 as ec2,
    aws_iam as iam,
    aws_elasticloadbalancingv2 as elb,
    aws_autoscaling as autoscaling,
    aws_ecs as ecs,
    aws_ecs_patterns as ecs_patterns,
    aws_eks as eks,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_rds as rds,
    core,
)


class HiAvailCdkStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, *, stack_tag="default", **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # Create a cluster
        vpc = ec2.Vpc(
            self, "Vpc",
            max_azs=2
        )
        cluster = ecs.Cluster(
            self, 'fargate-service-autoscaling',
            vpc=vpc
        )
        ========================================================================================================
        # Create the task
        my_task_definition = ecs.FargateTaskDefinition(self, "TaskDef", cpu=256, memory_limit_mib=512)
        # Create container
        the_container = ecs.ContainerDefinition(self, "httpdContainer",
            image=ecs.ContainerImage.from_registry("centos/httpd"),
            task_definition=my_task_definition,
            command=['/bin/sh -c "echo \'<html> <head> <title>Soeldner Consult AWS Demo</title><style>body {margin-top: 40px; background-color: #333;} </style> </head><body> <div style=color:white;text-align:center> <h1>Amazon ECS - Sample Web Server </h1> <h2>Congratulations!</h2> <p>You successfully set up your ECS cluster.</p> </div></body></html>\' > /usr/local/apache2/htdocs/index.html && httpd-foreground"'],
        )
        the_container.add_port_mappings(ecs.PortMapping(container_port=8080,protocol=ecs.Protocol.TCP))
        ========================================================================================================
        # Create Fargate service
        fargate_service = ecs_patterns.ApplicationLoadBalancedFargateService(self, "MyFargateService",
            cluster=cluster,            # Required
            cpu=512,                    # Default is 256
            desired_count=2,            # Default is 1
            task_image_options=ecs_patterns.ApplicationLoadBalancedTaskImageOptions(
                image=ecs.ContainerImage.from_registry("centos/httpd")),
            memory_limit_mib=2048,      # Default is 512
            public_load_balancer=True)  # Default is False


        fargate_service.service.connections.security_groups[0].add_ingress_rule(
            peer = ec2.Peer.ipv4(vpc.vpc_cidr_block),
            connection = ec2.Port.tcp(80),
            description="Allow http inbound from VPC"
        )

        # Setup AutoScaling policy
        scaling = fargate_service.service.auto_scale_task_count(
            max_capacity=2
        )
        scaling.scale_on_cpu_utilization(
            "CpuScaling",
            target_utilization_percent=50,
            scale_in_cooldown=core.Duration.seconds(60),
            scale_out_cooldown=core.Duration.seconds(60),
        )

        # lambda example

        # Defines an AWS Lambda resource
        my_lambda = _lambda.Function(
            self, 'HelloHandler',
            runtime=_lambda.Runtime.PYTHON_3_7,
            code=_lambda.Code.asset('lambda'),
            handler='hello.handler',
        )

        apigw.LambdaRestApi(
            self, 'Endpoint',
            handler=my_lambda,
        )

        
