from aws_cdk import (
    aws_ec2 as ec2,
    aws_iam as iam,
    core,
)

from aws_cdk.core import App, Stack, Tag
from aws_cdk.aws_ec2 import SubnetType, Vpc


class Ec2InstanceProps:
  image : ec2.IMachineImage
  instanceType : ec2.InstanceType
  userData : ec2.UserData
  subnet : ec2.ISubnet
  role : iam.Role


class Ec2(core.Resource):
    def __init__(self, scope: core.Construct, id: str, props: Ec2InstanceProps, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)
        # create a profile to attch the role to the instance
        name = id + 'Profile'
        roles = props.role.roleName
        profile = iam.CfnInstanceProfile(self, name, roles)
        # create the instance
        image_id = props.image.imageId
        instance_type = props.instanceType
        network_interfaces = props.subnet.subnetId
        user_data = props.userData
        iam_instance_profile = profile.ref
        instance = ec2.CfnInstance(self, id, image_id, instance_type, network_interfaces, user_data, iam_instance_profile)
        # tag the instance
        codestack_name = HiAvailCdkStack.__name__ + '/' + id
        Tag.add(instance, 'Name', codestack_name)


class HiAvailCdkStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        # create VPC w/ public and private subnets in 1 AZ
        #     this also creates a NAT Gateway
        vpc = ec2.Vpc(
            self, "MyVpc",
            max_azs=2
        )

        #private_subnets = vpc.select_subnets(subnet_type=SubnetType.PRIVATE)
        #private_subnet0 = ec2.SelectedSubnets(availability_zones='*', has_public=False, internet_connectivity_established=True, subnet_ids=0, subnets='*')

        # define the IAM role that will allow the EC2 instance to communicate with SSM
        role = iam.Role(self, "Role", assumed_by=iam.ServicePrincipal("ec2.amazonaws.com"))
        # arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
        role.add_managed_policy(iam.ManagedPolicy(self, id='mp', managed_policy_name='AmazonSSMManagedInstanceCore', statements=[iam.PolicyStatement(actions=['*'], resources=['*'])]))
        # define a user data script to install & launch our web server
        ssma_user_data = ec2.UserData.for_linux()
        SSM_AGENT_RPM = 'https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm'
        install_command = 'sudo yum install -y ' + SSM_AGENT_RPM
        ssma_user_data.add_commands('sudo yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpmhttps://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm', 'restart amazon-ssm-agent')
        # install and start Nginx
        ssma_user_data.add_commands('yum install -y nginx', 'chkconfig nginx on', 'service nginx start')

        # hi-avail-cdk/NewsBlogInstance
        # launch an EC2 instance in the private subnet
        instance = ec2.Instance(
            self, "NewsBlogInstance",
            vpc=vpc,
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE2, ec2.InstanceSize.MICRO
            ),
            machine_image=ec2.AmazonLinuxImage(),
            vpc_subnets={ 'subnet_type': ec2.SubnetType.PRIVATE },
            role=role,
            user_data=ssma_user_data
        )
