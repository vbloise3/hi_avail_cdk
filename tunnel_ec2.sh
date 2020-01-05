INSTANCE_EC2=$(aws ec2 describe-instances --filter "Name=tag:Name,Values=hi-avail-cdk/NewsBlogInstance" --query "Reservations[].Instances[?State.Name == 'running'].InstanceId[]" --output text)
aws ssm start-session --target $INSTANCE_EC2 --document-name AWS-StartPortForwardingSession --parameters '{"portNumber":["80"],"localPortNumber":["9999"]}'
