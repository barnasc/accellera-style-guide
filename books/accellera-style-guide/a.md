---
# Copyright 2024 Accellera. All rights reserved.
style: annex
---

# Annex A **(informative)** Accellera Documentation Flow

## A.1 Install Docker

The Accellera Documentation Flow is available as Docker image. A local installation of [Docker](https://docs.docker.com/get-started/) is required run the Accellera Documentation Flow. Docker is available for Windows, Linux and Mac. Please follow the instructions on the Docker website to install Docker Desktop.

## A.2 Install the Accellera Documentation Flow

The Accellera Documentation Flow is made available as Docker image which can be downloaded from the Accellera Technical Committee [documentation workspace](https://workspace.accellera.org/wg/docwg/document/13270). Load the Docker image as follows:

```bash
$ docker load -i adf_v0.7.tar.gz
```

Alternatively, the Docker image of the Accellera Documentation Flow can be built using one of the versions available in GitHub. The example below shows how to build version v0.7 of the flow:

```bash
$ git clone --branch v0.7 https://github.com/OSCI-WG/adf.git
# enter your GitHub account and password/token to clone the repository

$ cd adf
$ docker build -t adf:v0.7 .
```

## A.3 Using the Accellera Documentation Flow

Document sources will be stored in separate documentation repositories. In the example below, the Accellera `tc-documentation` GitHub repository will be used:

```bash
$ git clone https://github.com/OSCI-WG/tc-documentation.git
# enter your GitHub account and password/token to clone the repository

$ cd tc-documentation            # or working group specific documentation repository
```

To generate a document, use the `create` command followed by the document to be generated. In the example below, we generate the PDF for the Accellera Style Guide:

```bash
$ cd tc-documentation            # or working group specific documentation repository
$ ./create accellera-style-guide # for windows use ./create.bat
```

It will generate the PDF document of the Accellera Style Guide in the `output` directory. In addition, the intermediate HTML files are stored in the directory `output/html`. The PDF version of the Accellera Style Guide can be found in the [Accellera workspace](https://workspace.accellera.org/wg/docwg/document/12525).

In case section numbering is enabled, the updated Markdown source files are stored in `output/update`. The technical editor can compare them against the original source files in the `books` directory, and replace them if applicable.

## A.4 Using the flow in interactive mode

The Accellera Documentation Flow can also be executed in interative mode, by starting an interactive shell in the Docker container. For this, the `run` command can be used:

```bash
$ cd tc-documentation            # or working group specific documentation repository
$ ./run                          # for windows use ./run.bat         
```

It will open a Bash shell within the Docker container. You can now render one of the documents available in the `books` directory using the Electic Book commands:

```bash
adf@xyz $ npm run electric-book -- output --format screen-pdf --book accellera-style-guide
```

To close the interactive shell, type `exit` and it returns to your host shell.

The list of Electic Book commands is available in [Annex B](b.md).
