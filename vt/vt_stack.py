from aws_cdk import (
    Stack,
    Tags,
    RemovalPolicy,
    CfnOutput,
    aws_ec2 as ec2,
    aws_rds as rds,
    aws_s3 as s3,
    aws_cognito as cognito,
    aws_iam as iam,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
)
from constructs import Construct

class VtStack(Stack):

    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Apply global tag to everything in this stack
        Tags.of(self).add("Project", "CivicSight")

        # 1. VPC Definition
        # We use 1 Public Subnet (for EC2) and 1 Isolated Subnet (for RDS) to avoid NAT Gateway charges
        vpc = ec2.Vpc(self, "CivicSightVpc",
            max_azs=2,
            nat_gateways=0,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Public",
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Isolated",
                    subnet_type=ec2.SubnetType.PRIVATE_ISOLATED,
                    cidr_mask=24
                )
            ]
        )

        # 2. Cognito User Pool
        user_pool = cognito.UserPool(self, "CivicSightUserPool",
            user_pool_name="civicsight-users",
            self_sign_up_enabled=True,
            sign_in_aliases=cognito.SignInAliases(email=True),
            auto_verify=cognito.AutoVerifiedAttrs(email=True),
            user_verification=cognito.UserVerificationConfig(
                email_subject="Verify your CivicSight account",
                email_body="""
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                    <div style="background-color: #2d5a3d; padding: 24px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CivicSight</h1>
                    </div>
                    <div style="padding: 32px 24px; color: #334155;">
                        <h2 style="margin-top: 0; color: #1e293b;">Welcome to CivicSight!</h2>
                        <p style="font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
                            Thank you for joining. Please use the verification code below to confirm your email address and finish creating your account.
                        </p>
                        <div style="background-color: #f1f5f9; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 24px;">
                            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">{####}</span>
                        </div>
                        <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
                            If you didn't request this, you can safely ignore this email.
                        </p>
                    </div>
                    <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                            Built with ❤️ for the people of Raipur.<br>
                            &copy; CivicSight.
                        </p>
                    </div>
                </div>
                """,
                email_style=cognito.VerificationEmailStyle.CODE
            ),
            password_policy=cognito.PasswordPolicy(
                min_length=8,
                require_lowercase=True,
                require_uppercase=True,
                require_digits=True,
                require_symbols=False
            ),
            removal_policy=RemovalPolicy.DESTROY
        )
        
        # 2a. Cognito User Pool Client (for frontend auth)
        user_pool_client = cognito.UserPoolClient(self, "CivicSightUserClient",
            user_pool=user_pool,
            generate_secret=False,
            auth_flows=cognito.AuthFlow(user_password=True, user_srp=True)
        )

        # 3. S3 Bucket for photos
        photos_bucket = s3.Bucket(self, "CivicSightPhotosBucket",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
                    allowed_origins=["*"],
                    allowed_headers=["*"]
                )
            ]
        )

        # 3a. S3 Bucket for frontend static hosting
        frontend_bucket = s3.Bucket(self, "CivicSightFrontendBucket",
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
        )

        # 3b. CloudFront OAI for secure S3 access
        oai = cloudfront.OriginAccessIdentity(self, "CivicSightOAI",
            comment="OAI for CivicSight frontend"
        )
        frontend_bucket.grant_read(oai)

        # 3c. CloudFront Distribution for frontend
        distribution = cloudfront.Distribution(self, "CivicSightDistribution",
            default_behavior=cloudfront.BehaviorOptions(
                origin=origins.S3BucketOrigin.with_origin_access_identity(
                    frontend_bucket,
                    origin_access_identity=oai,
                ),
                viewer_protocol_policy=cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
            default_root_object="index.html",
            # SPA: route all 404s back to index.html for client-side routing
            error_responses=[
                cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path="/index.html",
                ),
                cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path="/index.html",
                ),
            ],
        )

        # 4. Security Groups
        ec2_sg = ec2.SecurityGroup(self, "CivicSightEc2Sg",
            vpc=vpc,
            description="Allow inbound HTTP/HTTPS from anywhere",
            allow_all_outbound=True
        )
        ec2_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(80), "Allow HTTP")
        ec2_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(443), "Allow HTTPS")
        ec2_sg.add_ingress_rule(ec2.Peer.any_ipv4(), ec2.Port.tcp(22), "Allow SSH")

        rds_sg = ec2.SecurityGroup(self, "CivicSightRdsSg",
            vpc=vpc,
            description="Allow inbound from EC2 only",
            allow_all_outbound=True
        )
        rds_sg.add_ingress_rule(ec2_sg, ec2.Port.tcp(5432), "Allow PostgreSQL access from EC2")

        # 5. RDS PostgreSQL Instance
        db_instance = rds.DatabaseInstance(self, "CivicSightDb",
            engine=rds.DatabaseInstanceEngine.postgres(
                version=rds.PostgresEngineVersion.VER_16
            ),
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE4_GRAVITON, 
                ec2.InstanceSize.MICRO
            ), # db.t4g.micro is free tier eligible
            vpc=vpc,
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PRIVATE_ISOLATED
            ),
            security_groups=[rds_sg],
            allocated_storage=20,
            max_allocated_storage=20, # Keep within free tier
            removal_policy=RemovalPolicy.DESTROY,
            deletion_protection=False
        )

        # 6. EC2 Instance
        ec2_instance = ec2.Instance(self, "CivicSightApiInstance",
            vpc=vpc,
            instance_type=ec2.InstanceType.of(
                ec2.InstanceClass.BURSTABLE3,
                ec2.InstanceSize.MICRO
            ), # t3.micro is free tier eligible in many regions
            machine_image=ec2.MachineImage.from_ssm_parameter(
                "/aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
            ),
            vpc_subnets=ec2.SubnetSelection(
                subnet_type=ec2.SubnetType.PUBLIC
            ),
            security_group=ec2_sg,
            key_pair=ec2.KeyPair.from_key_pair_name(self, "CivicSightKeyPair", "civicsight-key")
        )

        # Grant EC2 instance access to S3 bucket
        photos_bucket.grant_read_write(ec2_instance.role)

        # -----------------------------------------------------------------------
        # Stack Outputs — used by deployment scripts to wire env vars
        # -----------------------------------------------------------------------
        CfnOutput(self, "UserPoolId", value=user_pool.user_pool_id)
        CfnOutput(self, "UserPoolClientId", value=user_pool_client.user_pool_client_id)
        CfnOutput(self, "RdsEndpoint", value=db_instance.db_instance_endpoint_address)
        CfnOutput(self, "RdsSecretArn", value=db_instance.secret.secret_arn)
        CfnOutput(self, "Ec2PublicIp", value=ec2_instance.instance_public_ip)
        CfnOutput(self, "Ec2InstanceId", value=ec2_instance.instance_id)
        CfnOutput(self, "PhotosBucketName", value=photos_bucket.bucket_name)
        CfnOutput(self, "FrontendBucketName", value=frontend_bucket.bucket_name)
        CfnOutput(self, "FrontendUrl", value=f"https://{distribution.distribution_domain_name}")
        CfnOutput(self, "DistributionId", value=distribution.distribution_id)
