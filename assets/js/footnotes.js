/* eslint no-var: off */

// The above comment is necessary because Prince 11
// can't use let and const, as Standard JS would prefer.

// Move footnote text to the bottoms of pages by moving them
// from the end of the document (where kramdown gathers them)
// to a container div beside their in-text references.

function ebFootnotesToMove(wrapper) {
  'use strict'

  // If there are any footnotes ...
  if (wrapper.querySelector('.footnotes')) {
    // ... and if the page-footnotes setting is on,
    // or at least on for one of the footnotes
    if (wrapper.hasAttribute('data-page-footnotes') ||
      wrapper.querySelector('.footnotes .move-to-footnote')) {
      // ... then return true
      return true
    }
  }
}

function ebMoveEndnoteToFootnote(noteReference) {
  'use strict'

  // Get the footnote ID
  var footnoteReferenceID = noteReference.hash

  // NOTE: Prince's .hash behaviour is unusual: it strips the # out.
  // So, let's use getElementById instead of querySelector.
  // If it starts with a hash, chop it out.
  if (footnoteReferenceID.indexOf('#') === 0) {
    footnoteReferenceID = footnoteReferenceID.replace('#', '')
  }

  // Find the li with the ID from the .footnote's href
  var endnote = document.getElementById(footnoteReferenceID)

  // Check that we should actually process this footnote.
  // If the data-page-footnotes setting isn't applied to this doc...
  var wrapper = noteReference.closest('.wrapper')
  if (!wrapper.hasAttribute('data-page-footnotes')) {
    // ...check whether this particular footnote should be moved.
    if (!endnote.querySelector('.move-to-footnote')) {
      endnote.classList.add('endnote-text')
      noteReference.classList.add('endnote-reference')
      return
    }
  }

  // We need to look at the value of [data-page-footnotes] and
  // be a bit clever about which class we apply here,
  // so that we know which counter to increment in the CSS
  var pageFootnoteClass = 'page-footnote-manual'
  if (wrapper.hasAttribute('data-page-footnotes')) {
    if (wrapper.getAttribute('data-page-footnotes') === 'book') {
      pageFootnoteClass = 'page-footnote-book'
    } else {
      pageFootnoteClass = 'page-footnote-page'
    }
  }

  // Get the sup that contains the footnoteReference a.footnote
  var footnoteReferenceContainer = noteReference.parentNode

  // Get the element that contains the footnote reference
  var containingElement = noteReference.parentNode.parentNode

  // and add a class to it.
  containingElement.parentNode.className += ' contains-footnote'

  // footnotes in tables should be placed directly under the table
  var footnoteInTable = containingElement.closest('.table');
  if (footnoteInTable) {
    let parent = document.getElementById(footnoteInTable.id + '-footnotes')
    console.log('id', footnoteInTable.id, parent.children.length, noteReference.innerHTML);
    let listElement = document.createElement('li');
    listElement.innerHTML = '<span>' + endnote.querySelector('p').innerHTML + '</span>';
    parent.appendChild(listElement);
    noteReference.innerHTML = String.fromCharCode(96 + parent.children.length); // update footnote call
  }
  else {
    const footnoteSpan = document.createElement('span')
    footnoteSpan.classList.add('page-footnote')
    footnoteSpan.classList.add(pageFootnoteClass)
    footnoteSpan.id = footnoteReferenceID

    footnoteSpan.innerHTML = '<span>' + endnote.querySelector('p').innerHTML + '</span>'
    containingElement.insertBefore(footnoteSpan, footnoteReferenceContainer)
    containingElement.removeChild(footnoteReferenceContainer)
  }

  // Remove the old endnote
  endnote.parentNode.removeChild(endnote)
}

function ebFootnotesRenumberEndnotes() {
  'use strict'

  // Get all the endnote lists in the doc
  var endNoteLists = document.querySelectorAll('div.footnotes ol')

  // For each list, update the endnote numbers
  endNoteLists.forEach(function (list) {
    var endnoteListItems = list.querySelectorAll('li.endnote-text')

    // If we moved any notes to on-page footnotes with .move-to-footnote,
    // and we still have a list of endnotes, then we must renumber the endnote
    // references, because now the reference numbers will not match the
    // auto-numbered list of endnotes.
    // Note that the endnote *references* might be repeated (e.g. two places
    // in the text that refer to the same endnote).

    var i
    for (i = 0; i < endnoteListItems.length; i += 1) {
      var endnoteNewNumber = i + 1
      var endnoteOldID = endnoteListItems[i].id
      var endnoteNewID = endnoteOldID.replace(/fn:\d+$/, 'fn:' + endnoteNewNumber)
      var endnoteReferences = document.querySelectorAll('[href="#' + endnoteOldID + '"]')

      // Update all the endnote references that refer to the old number
      endnoteReferences.forEach(function (reference) {
        reference.innerHTML = endnoteNewNumber
        reference.hash = endnoteNewID
      })

      // Update the IDs of the endnotes sequentially
      endnoteListItems[i].id = endnoteListItems[i].id.replace(/fn:\d+$/, 'fn:' + endnoteNewNumber)
    }
  })
}

function ebEndnotesToFootnotes(wrapper) {
  'use strict'

  // Get all the a.footnote links we want to move
  var footnoteReferences = wrapper.querySelectorAll('.footnote')

  // Process all those footnotes
  var i
  for (i = 0; i < footnoteReferences.length; i += 1) {
    ebMoveEndnoteToFootnote(footnoteReferences[i])

    if (i === footnoteReferences.length - 1) {
      console.log('On-page footnotes moved. Now to renumber endnotes ...')
      ebFootnotesRenumberEndnotes()
    }
  }
}

// If there are footnotes to move, move them.
function ebFootnotesForPDF() {
  'use strict'

  var wrappers = document.querySelectorAll('.wrapper')

  wrappers.forEach(function (wrapper) {
    if (ebFootnotesToMove(wrapper)) {
      console.log('We have endnotes to move to page footnotes ...')
      ebEndnotesToFootnotes(wrapper)
    }
  })
}

// Go
ebFootnotesForPDF()
