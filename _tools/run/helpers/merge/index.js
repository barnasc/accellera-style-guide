// Lint with JS Standard

// Import Node modules
const jsdom = require('jsdom')
const { JSDOM } = jsdom
const fs = require('fs-extra')
const fsPath = require('path')
const fsPromises = require('fs/promises')
const buildTocNav = require('../reindex/build-toc-nav.js')

// Local helpers
const htmlFilePaths = require('../helpers').htmlFilePaths
const projectSettings = require('../helpers').projectSettings

// Make IDs in HTML unique by prefixing them
// with the slug of the filename, and updating
// any links that point to them.
function updateIDs(filename, dom, argv) {
  return new Promise(function (resolve, reject) {
    try {
      // Prefix IDs with a no-spaces, no-fullstops filename
      const prefix = 'file-' + filename.replace(/[.\s]/g, '-')
      const elementsWithIDs = dom.window.document.querySelectorAll('[id]')

      elementsWithIDs.forEach(function (el) {
        el.id = prefix + '-' + el.id
      })

      // To update links, we will:
      // - Give the .content an ID, created from the filename
      // - Remove filenames and add # IDs to links without them
      // - Update targets to include filename-slug prefixes

      // Give the .content element an ID from the filename,
      // so that we can point links to this file to that ID instead.
      const contentElement = dom.window.document.querySelector('.content')
      contentElement.id = prefix

      // Get all links
      const links = dom.window.document.querySelectorAll('a[href]')

      // Convert the Nodelist to an array for filtering
      const linksArray = Array.from(links)

      // Filter out the external links, if there are links
      let internalLinks
      if (linksArray.length > 0) {
        internalLinks = linksArray.filter(function (link) {
          let isInternal = true
          if (link.href.startsWith('https://') ||
            link.href.startsWith('mailto:') ||
            link.href.startsWith('http://')) {
            isInternal = false
          }
          return isInternal
        })
      }

      if (internalLinks) {
        internalLinks.forEach(function (link) {
          let href = link.getAttribute('href')

          // Initialise variables for the target filename and ID
          let linkFilenameAsPrefix
          let linkID

          // If an href contains slashes, it includes a path,
          // potentially to another book in this project.
          // If it's in the same book, we can simply remove the path
          // and only keep the filename.
          // If it's to another book, we must leave the link as is,
          // and set a flag that prevents us from changing it later.
          let hrefIsToThisBook = true
          if (href.match(/\//)) {
            const hrefAsArray = href.replace(/^\.\.\//, '').split('/')
            if (hrefAsArray[0] === argv.book) {
              href = hrefAsArray.pop()
            } else {
              hrefIsToThisBook = false
            }
          }

          // If the href:
          // - is internal to this book, and
          // - contains text and #, it points to a file and an ID
          // - starts with #, it points to an ID in this file
          // - doesn't include #, it points to another file.
          if (hrefIsToThisBook) {
            if (href.match(/.+#/)) {
              linkFilenameAsPrefix = 'file-' + href.split('#').shift()
                .replace(/[.\s]/g, '-')
              linkID = href.split('#').pop()
            } else if (href.startsWith('#')) {
              linkFilenameAsPrefix = prefix
              linkID = href.split('#').pop()
            } else {
              linkFilenameAsPrefix = 'file-' + href.replace(/[.\s]/g, '-')
            }

            // Change the link to an internal link that uses
            // the new ID prefix plus the linkID, if any.
            link.href = '#' + linkFilenameAsPrefix
            if (linkID) {
              link.href = '#' + [linkFilenameAsPrefix, linkID].join('-')
            }
          }
        })
      }

      resolve(dom)
    } catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

function getToCItems(items, dom, parent, init = false) {
  let start = init;
  for (let i = 0; i < items.length; i++) {
    let item = items[i];
    if (item && item.label && item.label.length && item.label.substring(0, 2) == '1.') {
      start = true;
    }
    if (!start) continue;  // skip all entries before clause 1
    let listElement = dom.window.document.createElement('li');
    listElement.className = "toc-entry-title";
    let refElement = dom.window.document.createElement('a');
    refElement.href = '#' + item.id;
    let spanElement = dom.window.document.createElement("span");
    spanElement.className = "toc-entry-text"
    spanElement.innerHTML = item.label.replace(/(<\/?strong>)/gi, "").replace(/(<\/?b>)/gi, ""); // remove strong/bold
    refElement.appendChild(spanElement);
    listElement.appendChild(refElement);
    if (item.children && item.children.length) {
      let olistElement = dom.window.document.createElement('ol');
      olistElement.className = "toc-list";
      listElement.appendChild(olistElement);
      getToCItems(item.children, dom, olistElement, start);
    }
    parent.appendChild(listElement);
  };
}

function updateToC(data, dom) {
  const outputList = data.reduce((arr, { level, ...rest }) => {
    const value = { ...rest, children: [] }
    arr[level] = value.children
    arr[level - 1].push(value)
    return arr
  }, [[]]).shift();
  let tocElements = dom.window.document.getElementsByClassName('toc-list');
  let tocElement = tocElements[tocElements.length - 1]; // get last element
  if (!tocElement) return; // no toc-list placeholder found, so no need to generate ToC
  console.log('Embedding ToC...')
  getToCItems(outputList, dom, tocElement);
}

function extractHeaders(dom, argv) {
  let headerElements = [];
  const headingLevels = projectSettings()[argv.format].toc['heading-levels'];
  const allHeadings = dom.window.document.querySelectorAll(headingLevels.join(', '));

  allHeadings.forEach(item => {
    if (!item.classList.contains('no-toc')) {
      headerElements.push({
        id: item.id,
        label: item.innerHTML,
        level: parseInt(item.nodeName[1])
      });
    }
  });
  return headerElements;
} 

// Merge source HTML files into a single file
async function merge(argv) {
  // Don't merge files if --merged has not
  // been passed at the command line
  if (argv.merged === false) {
    return
  }

  console.log('Merging HTML files...')

  return new Promise(function (resolve, reject) {
    try {
      const filePaths = htmlFilePaths(argv)
      let fileCounter = 1
      let mergedDom
      let tocEntries = [];
      const destination = fsPath.dirname(filePaths[0]) + '/merged.html'

      filePaths.forEach(async function (filePath) {
        // Parse the HTML
        let dom = new JSDOM(fs.readFileSync(filePath))

        // Update the IDs and links
        const filename = fsPath.basename(filePath)
        dom = await updateIDs(filename, dom, argv)

	      // extract headers 
        const headers = extractHeaders(dom, argv);
        if (headers.length) {
          tocEntries = [ ...tocEntries, ...headers ];
        }

        // If this is the first file, we'll use it as our base,
        // to which we'll append the remaining files.
        if (fileCounter === 1) {
          mergedDom = dom
        } else {
          // If this is not the first path, we only want its .wrapper,
          // so append that to the first file's body element.
          const newContent = dom.window.document.querySelector('.wrapper')
          const mergedBody = mergedDom.window.document.querySelector('body')
          mergedBody.append(newContent)
        }

        // When we've processed all the files,
        // write the serialized merged HTML to a file.
        // If this is not the last file, remove the script tag
        // that loads bundle.js, so it doesn't load multiple times.
        if (fileCounter === filePaths.length) {
          updateToC(tocEntries, mergedDom);
          console.log('Writing merged HTML to ' + destination)
          fsPromises.writeFile(destination, mergedDom.serialize())
          resolve(true)
        } else {
          const bundleScriptTag = mergedDom.window.document
            .querySelector('[data-script-name="bundle"]')
          bundleScriptTag.remove()
        }

        fileCounter += 1
      })
    } catch (error) {
      console.log(error)
      reject(error)
    }
  })
}

module.exports = merge
