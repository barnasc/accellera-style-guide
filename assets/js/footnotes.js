/* eslint no-var: off */

// The above comment is necessary because Prince 11
// can't use let and const, as Standard JS would prefer.

// Move footnote text to the bottoms of pages by moving them
// from the end of the document (where kramdown gathers them)
// to a container div beside their in-text references.

// NOTE: This implementation for the Accellera Documentation Flow
// differs significantly compared to the Electric Book Works version

function moveEndnotesToFootnotes(endnoteReferences, endNoteListItem, counter) {

  var i;
  for (i = 0; i < endnoteReferences.length; i++) {
    var reference = endnoteReferences[i];
    var endnoteReferenceID = reference.hash.replace('#', '');
    // check if the footnote is located in a table
    var footnoteInTable = reference.closest('.table');
    var str = footnoteInTable ? footnoteInTable.id : '';
    var parentTableFootnotes = document.getElementById(str + '-footnotes');
    // footnotes in tables should be placed directly under the table
    if (footnoteInTable && parentTableFootnotes ) {
      var listItem = parentTableFootnotes.querySelector('#' + endnoteReferenceID.replace(':', '-'));
      if (listItem == null && listItem == undefined) { // not found
        var listElement = document.createElement('li');
        listElement.id = endnoteReferenceID.replace(':', '-');
        listElement.innerHTML = '<span>' + endNoteListItem.querySelector('p').innerHTML + '</span>';
        parentTableFootnotes.appendChild(listElement);
        reference.innerHTML = String.fromCharCode(96 + parentTableFootnotes.children.length); // update footnote call
        reference.href = '#' + endnoteReferenceID.replace(':', '-');
      } else {
        var cnt = 0;
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
      if (i == 0 || parentTableFootnotes == null ) { // first reference in the series
        // Get the sup that contains the footnoteReference a.footnote
        var footnoteReferenceContainer = reference.parentNode;
        // Get the element that contains the footnote reference
        var containingElement = reference.parentNode.parentNode;
        const footnoteSpan = document.createElement('span');
        footnoteSpan.classList.add('page-footnote');
        footnoteSpan.classList.add('page-footnote-book');
        footnoteSpan.id = endnoteReferenceID;
        footnoteSpan.innerHTML = '<span>' + endNoteListItem.querySelector('p').innerHTML + '</span>';
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
function ebFootnotesForPDF() {
  'use strict'

  // Get all the endnote lists in the doc
  var endNotesLists = document.querySelectorAll('div.footnotes ol');
  var footnoteCounter = 0;

  // For each list, update the endnote numbers
  endNotesLists.forEach(function (list) {
    var endNoteListItems = list.querySelectorAll('li');

    for (var i = 0; i < endNoteListItems.length; i += 1) {
      var items = document.querySelectorAll('[href="#' + endNoteListItems[i].id + '"]');
      moveEndnotesToFootnotes(items, endNoteListItems[i], footnoteCounter);
    }
  })

  // remove endnotes
  endNotesLists.forEach(function (list) {
    list.parentNode.removeChild(list);
  });
}

// Go
ebFootnotesForPDF()
