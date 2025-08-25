const fs = require('fs-extra');
const fsPath = require('path');
const yaml = require('js-yaml');
const readline = require('readline');
const { ebSlugify } = require('../../../gulp/helpers/utilities.js');

async function numberSections(argv, files) {

  this.isChapter = false;
  this.prevFile = '';
  this.inCodeBlock = false;
  this.inRawBlock = false;
  this.inCommentBlock = false;
  this.annexLevel = 0;
  this.topicName = [];
  this.override = argv.override;
  this.numberingDepth = (argv['section-numbering'] > -1 && argv['section-numbering'] < 6) ? argv['section-numbering'] : 5;
  this.section = {};
  this.figureNumber = 0;
  this.tableNumber = 0;
  this.equationNumber = 0;
  this.fileName = '';
  this.type = ""; // e.g. standard doc

  if (!files) {
    console.log('numberSections: files not specified. Skipped.');
    return;
  }

  function resetSectionNumbering() {
    this.sectionNumber = {};
    for (let i = 0; i < this.numberingDepth; i++) {
      this.sectionNumber[i] = 0;
    }
  }

  function getMetaData(argv) {
    let book = 'book'; // default
    if (argv.book) {
      book = argv.book;
    }

    // Build path to YAML data for this book
    const pathToYAMLFolder = process.cwd() +
      '/_data/works/' + book + '/';

    // Build path to default-edition YAML
    const pathToDefaultYAML = fsPath.normalize(pathToYAMLFolder + 'default.yml');

    // Get the files list
    const metadata = yaml.load(fs.readFileSync(pathToDefaultYAML, 'utf8'));

    // get type of document
    if (metadata.type) {
      this.type = metadata.type;
    }
  }

  function getFileName(file) {
    let parts = file.temp.split('/');
    let filePrefix;
    if (parts.length) {
      filePrefix = parts[parts.length-1]; // remove path from filename
    } else {
      filePrefix = file.temp; // there is no path
    }
    return filePrefix; //.replace('md', 'html');
  }
  
  function storeId(label, oldref, newref, title) {
    let nlabel = label;
    let prefix;

    if (this.type.toLowerCase().includes('standard')) {
      prefix = 'Clause ';
    } else {
      prefix = 'Chapter ';
    }

    if (this.section[oldref] != undefined) {
      console.error('WARNING: Duplicated ID found! Check correctness of source files.', oldref);
      return;
    }

    // For Chapters/clauses, the reference name should include the full name
    if (nlabel[nlabel.length-1] == '.') {
      nlabel = prefix + label.replace('.',''); // remove dot
    }

    this.section[oldref] = {
      label: nlabel,
      ref: newref,
      title: title,
      file: this.fileName
    }

    // add reference via file to main chapter
    if (!this.section[this.fileName]) {
      this.section[this.fileName] = {
        label: nlabel,
        ref: this.fileName,
        title: title,
        file: this.fileName
      }
      //console.log("add section", this.fileName, this.section[oldref]);
    }
    //console.log("add section", oldref, this.section[oldref]);
  }

  async function waitForStreamClose(stream) {
    stream.end();
    return new Promise((resolve) => {
        stream.once('finish', () => {
            resolve();
        });
    });
  }

  async function processFile(file, updateXref=false) {
    const readableStream = fs.createReadStream(file.temp, { flags: 'r', encoding: 'utf-8' });
    const writeStream = fs.createWriteStream(file.source, { flags: 'w', encoding: 'utf-8' });
    let block = '';

    const lineReader  = readline.createInterface({
      input: readableStream,
      //crlfDelay: Infinity
    });

    lineReader.on('error', function (error) {
      console.log(`error: ${error.message}`);
    });

    readableStream.on('end', function() {
      if (block) {  // at EoL, check if there are pending lines in the buffer
        const updatedBlock = updateBlock(block, updateXref);
        writeStream.write(updatedBlock);
      }
    });

    if (this.inCodeBlock) {
      console.log('error: file found with incomplete code block: ', this.prevFile);
      process.exit(1);
    }

    // instead of processing a single line, we merge
    // multiple lines into a single block, as this is
    // required for figures
    for await (const line of lineReader) {
      block += line + '\n';

      const codeBlockFound = line.match(/\`{3}/); 
      if (codeBlockFound) {
        //console.log('found:', codeBlockFound);
        this.inCodeBlock = !this.inCodeBlock;
        if (!this.inCodeBlock) { // write code block when end is found
          //console.log('write:', block);
          writeStream.write(block);
          block = '';
        }
      }

      if (!this.inCodeBlock) {
      // process block when empty line (next paragraph) is found
      // make sure we detect 'empty lines' which only contain spaces
      if ((line.replace(' ','') == '')) { 
        let updatedBlock = block;
        updatedBlock = updateBlock(block, updateXref);
        writeStream.write(updatedBlock);
        block = '';
      }
      }
    };
    this.prevFile = file.temp;
    return waitForStreamClose(writeStream);
  }

  function updateBlock(block, updateXref) {
    const section = block.match(/^#+/);
    const chapter = block.match(/style: chapter/);
    const annex = block.match(/style: annex/);
    const xref = [...block.matchAll(/(\[[0-9a-zA-Z\s.\-]+\]|\[\])\((([^\s^\)]+)?)\)/gi)];
    //const codeblockStart = block.match(/^\`{3}/);
    //const codeblockEnd = block.match(/\`{3}\n\n$/);
    const rawblockStart = block.match(/^\{\%\s*raw\s*\%\}/);
    const rawblockEnd = block.match(/\{\%\s*endraw\s*\%\}\n\n/);
    const commentblockStart = block.match(/^\{\%\s*comment\s*\%\}/);
    const commentblockEnd = block.match(/\{\%\s*endcomment\s*\%\}\n\n/);
    const table = block.match(/^\{\%\s+include\s+table/);
    const figure = block.match(/^\{\%\s+include\s+figure/);
    const equation = block.match(/^\{\%\s+include\s+equation/);
    if (xref.length && updateXref) {
      return updateCrossReference(xref, block);
    }

    if (updateXref) {
      return block;
    }

    //if(codeblockStart && !codeblockEnd) {
    //  this.inCodeBlock = true;
    //}

    if(rawblockStart && !rawblockEnd) {
      this.inRawBlock = true;
    }

    if(commentblockStart && !commentblockEnd) {
      this.inCommentBlock = true;
    }

    if (chapter) {
      this.isChapter = true;
      this.annexLevel = 0;
    }

    if (annex) {
      if (this.annexLevel==0) {
        this.annexLevel = this.sectionNumber[0];
      }
      // reset numbering for annex
      this.tableNumber = 0; 
      this.figureNumber = 0;
    }

    if (section && (this.isChapter || this.annexLevel>0) && !this.inCodeBlock && !this.inRawBlock && !this.inCommentBlock) {
      level = section[0].length;
      return updateSectionNumber(block, level);
    }

    if (table && !this.inCodeBlock && !this.inRawBlock && !this.inCommentBlock) {
      return updateTableReference(block);
    }

    if (figure && !this.inCodeBlock && !this.inRawBlock && !this.inCommentBlock) {
      return updateFigureReference(block);
    }

    if (equation && !this.inCodeBlock && !this.inRawBlock && !this.inCommentBlock) {
      return updateEquationReference(block);
    }

    //if (codeblockEnd) {
    //  this.inCodeBlock = false;
    //}

    if(rawblockEnd) {
      this.inRawBlock = false;
    }

    if(commentblockEnd) {
      this.inCommentBlock = false;
    }

    return block; // no change if no other match found
  }

  function updateTableReference(block) {
    let nblock = block;
    let number = 'Table ';
    const tableref = block.match(/reference=\"(.*)\"/);
    const tablecaption= block.match(/caption=\"(.*)\"/);
    if (!tableref) {
      return block; // table reference not found
    } else {
      this.tableNumber +=1;
      if (this.annexLevel>0) {
        number += String.fromCharCode(64 + this.sectionNumber[0] - this.annexLevel) + '.' + this.tableNumber;
      } else {
        number +=  this.tableNumber;
      }
      nblock = nblock.replace('\"' + tableref[1] + '\"', '\"' + number + '\"');
      //console.log(' replace ', tableref[1], number);
      storeId(number, ebSlugify(tableref[1]), ebSlugify(number), tablecaption[1]);
    }
    return nblock;
  }

  function updateFigureReference(block) {
    let nblock = block;
    let number = 'Figure ';
    const ref = block.match(/reference=\"(.*)\"/);
    const caption= block.match(/caption=\"(.*)\"/);
    if (!ref) {
      return block; // figure reference not found
    } else {
      this.figureNumber +=1;
      if (this.annexLevel>0) {
        number += String.fromCharCode(64 + this.sectionNumber[0] - this.annexLevel) + '.' + this.figureNumber;
      } else {
        number +=  this.figureNumber;
      }
      nblock = nblock.replace('\"' + ref[1] + '\"', '\"' + number + '\"');
      //console.log(' replace ',ref[1], number);
      storeId(number, ebSlugify(ref[1]), ebSlugify(number), caption[1]);
    }
    return nblock;
  }

  function updateEquationReference(block) {
    let nblock = block;
    let prefix = 'Equation ';
    const ref = block.match(/reference=\"(.*)\"/);
    if (!ref) {
      return block; // equation reference not found
    } else {
      this.equationNumber +=1;
      if (this.annexLevel>0) {
        number = String.fromCharCode(64 + this.sectionNumber[0] - this.annexLevel) + '.' + this.equationNumber;
      } else {
        number =  this.equationNumber;
      }
      nblock = nblock.replace('\"' + ref[1] + '\"', '\"' + this.equationNumber + '\"');
      //console.log(' replace ',ref[1], number);
      storeId(prefix + number, ebSlugify(prefix + ref[1]), ebSlugify(prefix + number), '');
    }
    return nblock;
  }

  function updateCrossReference(xref, block) {
    let nblock = block;
    let id;
    let ref;
    //console.log('xref', xref);
    for (let i = 0; i < xref.length; i++) {
      //if (!xref[i][2]) continue; // no reference found, skip
      let oldref = xref[i][2].split('#');
      //console.log('oldref',oldref)
      if (oldref && (oldref.length == 2)) {
        id = this.section[oldref[1]];
        ref = oldref[0] + '#';
      } else {
        id = this.section[xref[i][2]];
        ref = '';
      }
      if (id) {
        //console.log('old:', nblock);
        nblock = nblock.replaceAll(xref[i][1], '[\u00A4\u00A4' + id.label + ']');
        nblock = nblock.replaceAll('('+xref[i][2]+')', '(\u00A4\u00A4'+ref+id.ref+')');
        //console.log('new:', nblock);
      } else {
        console.warn('WARNING: xref - no cross reference found for ID', xref[i][2], 'in file:', this.fileName);
      }
    }
    // TODO workaround to avoid replacing same xref twice, by adding a special
    // token u00A4, and deleting it afterwards
    return nblock.replaceAll('\u00A4\u00A4',''); 
  }

  function updateSectionNumber(block, targetLevel) {
    nblock = block;
    let regex;
    if (this.annexLevel > 0) { // annex
      regex = new RegExp('^#{' + targetLevel + '}\\s*([A-Z](\\.\\d+)*|Annex\\s+[A-Z])?\\s+(.+)?');
    } else { // chapter
      regex = new RegExp('^#{' + targetLevel + '}\\s*(\\d+(\\.\\d+)*.?)?\\s+(.+)?');
    }        

    const match = block.match(regex);
    // regex failed, probably different syntax, so keep block untouched
    if (!match) return block;

    const number = calculateSectionNumber(targetLevel);
    let oldref = ebSlugify(match[1] + ' ' + match[3]);
    let newref = ebSlugify(number + ' ' + match[3]);
    storeId(number, oldref, newref, match[3]);

    if (targetLevel <= this.numberingDepth) {
      if (match[1]) {
        nblock = block.replace(match[1], number);
      } else { // number was missing, add
        nblock = block.slice(0, targetLevel+1) + number + ' ' + block.slice(targetLevel+1);
      }
    } else {
      if (match[1]) {
        nblock = block.replace(match[1] + ' ', ''); // remove number and one space when depth is changed
      }
    }
    return nblock;
  }

  function calculateSectionNumber(level) {
    this.sectionNumber[level-1] += 1;

    for (let i = level; i < this.numberingDepth; i++) { 
      if (this.sectionNumber[i] && this.sectionNumber[i] > 0) {
        this.sectionNumber[i] = 0;
      }
    }

    let number = "";
    // add trailing dot for chapters
    if ((this.annexLevel>0) && (level == 1)) {
      number += 'Annex ';
    }

    for (let i = 0; i < level; i++) {
      if (i>0) number += '.';
      if ((i == 0) && this.annexLevel!=0) {
        number += String.fromCharCode(64 + this.sectionNumber[i] - this.annexLevel);
      } else {
        number += this.sectionNumber[i].toString();
      }
    }
    // add trailing dot for chapters
    if ((level-1 == 0) && (this.annexLevel==0)) {
      number += '.';
    }
    return number;
  }

  // helper function to copy file and append with ending newline if missing
  async function copyFileAppendNewLine(file) {
    try {
      const content = await fs.readFile(file.source, 'utf8');
      if (typeof content !== 'string') {
        throw new TypeError('Content of file is not a string. Abort.');
      }
      const matches = content.match(/\r?\n$/); // check for LF or CRLF
      const EOF = (matches) ? '' : '\n';
      await fs.writeFile(file.temp, content + EOF, 'utf8');
    } catch (error) {
        throw new TypeError('Unable to copy file. Abort.');
    }
  }

  // main function called here
  
  getMetaData(argv);

  // 1st pass
  console.log('INFO: Numbering 1st pass...');

  // files copied to temp folder to enable updates of sources
  await fs.emptyDir(process.cwd() + '/.temp/' + argv.book);
  for (let i = 0; i < files.length; i++) {
    await copyFileAppendNewLine(files[i]);
  }

  resetSectionNumbering();
  for (let i = 0; i < files.length; i++) {
    this.fileName = getFileName(files[i]);
    await processFile(files[i]);
  }
  //console.log('section', this.section);

  // 2nd pass to update xrefs
  console.log('INFO: Numbering 2nd pass...');

  // first copy updated source files again to temp folder
  fs.copySync(process.cwd() + '/' + argv.book, process.cwd() + '/.temp/' + argv.book);

  resetSectionNumbering();
  for (let i = 0; i < files.length; i++) {
    this.fileName = getFileName(files[i]);
    await processFile(files[i], updateXref=true);
  }

}

module.exports = numberSections
