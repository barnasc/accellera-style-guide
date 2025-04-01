// Move footnote text to the bottoms of pages by moving them
// from the end of the document (where kramdown gathers them)
// to a container div beside their in-text references.

// If the footnote is in a liquid-wrapped table, the footnote will
// be placed directly under the table using the table footnotes
// anchor

// NOTE: This implementation for the Accellera Documentation Flow
// differs significantly compared to the Electric Book Works version
// For that reason the method names have been renamed

function moveEndnotesToFootnotes(item, counter) {
  let endnoteReferences = document.querySelectorAll('[href*="' + item.id + '"]');
  for (let i = 0; i < endnoteReferences.length; i++) {
    let reference = endnoteReferences[i];
    let endnoteReferenceID = reference.hash.replace('#', '');
    // check if the footnote is located in a table
    let footnoteInTable = reference.closest('table');
    let footnoteInTableWrapper = reference.closest('.table');
    let parentTableFootnotes = footnoteInTableWrapper ? document.getElementById(footnoteInTableWrapper.id + '-footnotes') : null;
    // footnotes in tables should be placed directly under the table
    if (footnoteInTableWrapper && parentTableFootnotes ) {
      let listItem = parentTableFootnotes.querySelector('#' + endnoteReferenceID.replace(':', '-'));
      if (listItem == null && listItem == undefined) { // not found
        let listElement = document.createElement('li');
        listElement.id = endnoteReferenceID.replace(':', '-');
        listElement.innerHTML = '<span>' + item.obj.querySelector('p').innerHTML + '</span>';
        parentTableFootnotes.appendChild(listElement);
        reference.innerHTML = String.fromCharCode(96 + parentTableFootnotes.children.length); // update footnote call
        reference.href = '#' + endnoteReferenceID.replace(':', '-');
      } else {
        let cnt = 0;
        let prev_elem = listItem;
        while (prev_elem) {
          cnt++;
          prev_elem = prev_elem.previousElementSibling;
        }
        reference.innerHTML = String.fromCharCode(96 + cnt); // update footnote call 
        reference.href = '#' + endnoteReferenceID.replace(':', '-');
      }
    }
    else { // move Endnote into Footnote
      if (i == 0                                             // first reference in the series
            || (footnoteInTable && !parentTableFootnotes)) { // or process footnote in regular table
        // Get the sup that contains the footnoteReference a.footnote
        let footnoteReferenceContainer = reference.parentNode;
        // Get the element that contains the footnote reference
        let containingElement = reference.parentNode.parentNode;
        const footnoteSpan = document.createElement('span');
        footnoteSpan.classList.add('page-footnote');
        footnoteSpan.classList.add('page-footnote-book');
        footnoteSpan.id = endnoteReferenceID;
        footnoteSpan.innerHTML = '<span>' + item.obj.querySelector('p').innerHTML + '</span>';
        containingElement.insertBefore(footnoteSpan, footnoteReferenceContainer);
        containingElement.removeChild(footnoteReferenceContainer);
        firstFootnoteFromSeries = false;
        counter++;
      }
      else { // other reference in the series
        reference.innerHTML = counter;
      }
    }
  }
}

// If there are footnotes to move, move them.
function adfFootnotesForPDF() {
  'use strict'

  // Get all the endnote lists in the doc
  let endNotesLists = document.querySelectorAll('div.footnotes ol');
  let footnoteCounter = 0;
  let footnoteList = [];

  // For each list, update the endnote numbers
  endNotesLists.forEach(function (list) {
    let endNoteListItems = list.querySelectorAll('li');
    endNoteListItems.forEach( item => {
      footnoteList.push({ id: item.id, obj: item});
    });
  });
  footnoteList.forEach( item => moveEndnotesToFootnotes(item, footnoteCounter));

  // remove endnotes
  endNotesLists.forEach(function (list) {
    list.parentNode.removeChild(list);
  });
}

// Call main function
adfFootnotesForPDF()
