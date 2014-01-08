require "rock_config"
require "aws/s3"
require "time"

namespace :deploy do
  desc "Upload trackets client to S3"
  task :upload do
    aws_config = RockConfig.for :aws, "production"

    AWS::S3::DEFAULT_HOST.replace "s3-eu-west-1.amazonaws.com"
    AWS::S3::Base.establish_connection!(
      access_key_id: aws_config.access_key_id,
      secret_access_key: aws_config.secret_access_key
    )

    system("make advanced")
    file = File.read("dist/main.min.js")
    file_history_name = Time.now.utc.strftime("%Y%m%d%H%M%S")

    options = {
      "access"        => :public_read,
      "Cache-Control" => "public, max-age=900, must-revalidate"
    }

    ["trackets", "assets.trackets.com"].each do |bucket_name|
      ["client.js", "client.js-#{file_history_name}"].each do |script_name|
        upload_result = AWS::S3::S3Object.store(script_name, file, bucket_name, options)
        fail "Unable to upload #{script_name} to S3 bucket #{bucket_name}" unless upload_result
      end
    end
  end
end

