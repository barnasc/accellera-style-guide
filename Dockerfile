# Dockerfile to create a ready-to-use docker image containing
# the Accelllera Documentation Flow using the Electric Book templates

FROM ubuntu:22.04

# Main dependency installation
RUN apt-get update && apt-get install -y \
  software-properties-common \
  make \
  gcc \
  build-essential \
  git \
  wget \
  libgif7 \
  libpixman-1-0 \
  libffi-dev \
  libreadline-dev \
  zlib1g-dev \
  graphicsmagick \
  ruby-full

# Dependencies specifically for Puppeteer on unix
#RUN apt-get install -y \
#  libasound2 \
#  libatk1.0-0 \
#  libatk-bridge2.0-0 \
#  libcairo2 \
#  libdrm2 \
#  libgbm1 \
#  libnss3 \
#  libpango-1.0-0 \
#  libxkbcommon-x11-0 \
#  libxcomposite1 \
#  libxdamage1 \
#  libxfixes3 \
#  libxrandr2

# Install Microsoft Core Fonts
RUN echo ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true | debconf-set-selections
RUN apt-get install ttf-mscorefonts-installer -y

# Add node source for new nodejs, instead of old Ubuntu-installed node.
# https://github.com/nodesource/distributions/wiki/How-to-migrate-to-the-new-repository

# Update local package index
RUN apt-get update
# Install necessary packages for downloading and verifying new repository information
RUN apt-get install -y ca-certificates curl gnupg
# Create a directory for the new repository's keyring, if it doesn't exist
RUN mkdir -p /etc/apt/keyrings
# Download the new repository's GPG key and save it in the keyring directory
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
# Add the new repository's source list with its GPG key for package verification
# Note: `node_20` means Node version 20. Update in future as needed.
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
# Update local package index to recognize the new repository
RUN apt-get update
# Install Node.js from the new repository
RUN apt-get install -y nodejs

# Install program to configure locales
RUN apt-get install -y locales
RUN dpkg-reconfigure locales && \
  locale-gen C.UTF-8 && \
  /usr/sbin/update-locale LANG=C.UTF-8

# Set default locale for the environment
ENV LC_ALL C.UTF-8
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US.UTF-8

# Clear apt cache to make image smaller
RUN apt-get clean && rm -rf /var/lib/apt/lists/* /tmp/*

# Install libssl1.1
RUN wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.0g-2ubuntu4_amd64.deb && \
  dpkg -i libssl1.1_1.1.0g-2ubuntu4_amd64.deb

# Install PrinceXML for printing to PDF
#RUN wget https://www.princexml.com/download/prince_11.4-1_ubuntu18.04_amd64.deb && \
#  dpkg -i prince_11.4-1_ubuntu18.04_amd64.deb

# Install pandoc for document conversion
#RUN wget https://github.com/jgm/pandoc/releases/download/2.5/pandoc-2.5-1-amd64.deb && \
#  dpkg -i pandoc-2.5-1-amd64.deb

# Update npm
RUN npm install -g npm@latest

# Install Gulp cli app
RUN npm install --global gulp-cli

# Install bundler and jekyll
RUN gem install jekyll bundler

# Install gems.
COPY Gemfile .
RUN bash -lc "bundle install"

# Switch to the user account
RUN useradd -ms /bin/bash adf
USER adf
WORKDIR /home/adf

# Set paths for Ruby gems
RUN echo '# Define Ruby Gems path' >> ~/.bashrc
RUN echo 'export GEM_HOME="$HOME/.rvm/gems/ruby-2.7.6"' >> ~/.bashrc
RUN echo 'export PATH="$HOME/.rvm/gems/ruby-2.7.6:$PATH"' >> ~/.bashrc
RUN bash -lc "source ~/.bashrc"

# Copy all flow elements to container
COPY --chown=adf:adf . .

# Install Accellera Documentation Flow
RUN npm install
