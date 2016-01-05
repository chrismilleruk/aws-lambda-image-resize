# aws-lambda-image-resize

Resizing images (creating thumbnails) in response to S3 Image upload

![diagram1](https://raw.githubusercontent.com/chrismilleruk/aws-lambda-image-resize/master/diagram1.png)

## Setup

Environment prerequisites:

    npm install -g gulp
    npm install -g aws-sdk

Get NPM dependencies for ./ _and_ ./src/

    npm install
    cd src/
    npm install
    cd ..

## Usage

Update lambda config ([more](https://github.com/giowe/slush-aws-lambda#configuration))

    gulp configure

Other commands ([more](https://github.com/giowe/slush-aws-lambda#usage))

    gulp create
    gulp update
    gulp update-config
    gulp update-code

## Attribution

Generated with [`slush aws-lambda`](https://github.com/giowe/slush-aws-lambda)

Based on [aws-lambda-create-thumbnail](https://github.com/trinketapp/aws-lambda-create-thumbnail)

## License
MIT License

Copyright (c) 2016 Chris Miller
