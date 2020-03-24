<?php require 'vendor/autoload.php';?>
<html>
<body>
<h1>Sample Page</h1>
<?php
    $name = "Vince";
?>
<h2>Hello</h2>
<?php
    echo $name;
?>
<?php
    use Aws\S3\S3Client;
    use Aws\S3\Exception\S3Exception;
    $bucket = 'awsc2ppracticevbloise3';
    $keyname = 'ML_Practice_Exam_Questions-o_ml.json';

    $s3 = new Aws\S3\S3Client([
        'version' => 'latest',
        'region'  => 'us-west-2'
    ]);

    try {
        $result = $s3->getObject([
        'Bucket' => $bucket,
        'Key'    => $keyname
        ]);

        header("Content-Type: {$result['ContentType']}");
        echo $result['Body'];
    } catch (S3Exception $e) {
        echo 'error in s3 get';
        echo $e->getMessage() . PHP_EOL;
    }
?>
<?php
    echo ' ';
    echo $name;
?>
//cd /var/www/html