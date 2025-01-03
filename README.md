# Accellera Documentation Flow (ADF)

The Accellera Documentation Flow offers the infrastructure to develop and publish Accellera (Draft) Standards, User Guides and other standard-related documentation. The main output are high-quality documents in Portable Document Format (PDF) compliant with the IEEE SA Standards Style Manual. Future extensions of this flow will also render interactive browser-compatible standards in HTML format. 

The documentation flow is documented in the [Accellera Style Guide](https://workspace.accellera.org/wg/docwg/document/12525), which explains the Markdown formatting and styles to create Accellera or IEEE SA Standards compliant documents.

## Usage

The document sources should be stored in the directory `books/<standard-document>/`.

The document metadata (e.g. properties) should be stored in the directory `_data/works/<standard-document>/`.

To render a PDF document using the Accellera Documentation Flow, use the following command:

```bash
$ npm run eb -- output --format screen-pdf --book <standard-document>
```

It will generate a PDF document in the `_output` directory.

Please contact the Technical Committee Chair in case of questions on the Accellera Documentation Flow, the required installation procedure or use of the standard document templates.

## Creating a Docker image

The Accellera Documentation Flow can be made available as Docker image. The example below shows how to build version v0.7 of the flow:

```bash
$ git clone --branch v0.7 https://github.com/OSCI-WG/adf.git
# enter your GitHub account and password/token to clone the repository

$ cd adf
$ docker build -t adf:v0.7 .
```

Alternatively, a pre-build Docker image of the flow can be downloaded from the Accellera Technical Committee [documentation workspace](https://workspace.accellera.org/wg/docwg/document/13270). Load the Docker image as follows:

```bash
$ docker load -i adf_v0.7.tar.gz
```

## Acknowledgment

Special thanks to [Electric Book Works](https://electricbookworks.com/) for the development and support of the Accellera Documentation Flow.
