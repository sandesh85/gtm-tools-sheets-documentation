function insertSheet(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  var ui = SpreadsheetApp.getUi();
  var response;
  if (sheet) {
    response = ui.alert('Sheet named ' + sheetName + ' already exists! Click OK to overwrite, CANCEL to abort.', ui.ButtonSet.OK_CANCEL);
    return response === ui.Button.OK ? sheet : false;
  }
  return SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
}

function getAssetOverview(assets) {
  var assetlist = {};
  var sortedlist = [];
  var sum = 0;  
  assets.forEach(function(item) {
    if (!assetlist[item.type]) {
      assetlist[item.type] = 1;
    } else {
      assetlist[item.type] += 1;
    }
    sum += 1;
  });
  for (var item in assetlist) {
    sortedlist.push([item, assetlist[item]]);
  }
  sortedlist = sortedlist.sort(function(a,b) {
    return b[1] - a[1];
  });
  return {
    sortedlist: sortedlist.length === 0 ? [['','']] : sortedlist,
    sum: sum
  }
}

function markChangedNotes() {
  var namedRanges = SpreadsheetApp.getActiveSpreadsheet().getNamedRanges();
  var rangesObject = {};
  
  namedRanges.forEach(function(range) {
    var name = range.getName();
    var bareName = name.replace(/(_notes|_json)$/g, '');
    rangesObject[bareName] = rangesObject[bareName] || {};
    if (/_notes$/.test(name)) {
      rangesObject[bareName].notes = range.getRange();
    }
    if (/_json$/.test(name)) {    
      rangesObject[bareName].json = range.getRange();
    }
  });
  
  for (var item in rangesObject) {
    var notes = rangesObject[item].notes.getValues();
    var json = rangesObject[item].json.getValues();
    notes.forEach(function(note, index) {
      var jsonNote = JSON.parse(json[index]).notes || '';
      if ((note[0] === '' && jsonNote === '') || (note[0] === jsonNote)) { 
        rangesObject[item].notes.getCell(index + 1, 1).setBackground('#fff');
      } else {
        rangesObject[item].notes.getCell(index + 1, 1).setBackground('#f6b26b');
      }
    });
  }
}

function formatTags(tags) {
  var data = [];
  tags.forEach(function(tag) {
    data.push([
      tag.name,
      tag.tagId,
      tag.type,
      tag.parentFolderId || '',
      new Date(parseInt(tag.fingerprint)),
      tag.firingTriggerId ? tag.firingTriggerId.join(',') : '',
      tag.blockingTriggerId ? tag.blockingTriggerId.join(',') : '',
      tag.setupTag ? tag.setupTag[0].tagName : '',
      tag.teardownTag ? tag.teardownTag[0].tagName : '',
      tag.notes || '',
      JSON.stringify(tag)
    ]);
  });
  return data;
}

function formatVariables(variables) {
  var data = [];
  variables.forEach(function(variable) {
    data.push([
      variable.name,
      variable.variableId,
      variable.type,
      variable.parentFolderId || '',
      new Date(parseInt(variable.fingerprint)),
      variable.notes || '',
      JSON.stringify(variable)
    ]);
  });
  return data;
}

function formatTriggers(triggers) {
  var data = [];
  triggers.forEach(function(trigger) {
    data.push([
      trigger.name,
      trigger.triggerId,
      trigger.type,
      trigger.parentFolderId || '',
      new Date(parseInt(trigger.fingerprint)),
      trigger.notes || '',
      JSON.stringify(trigger)
    ]);
  });
  return data;
}

function setNamedRanges(sheet,notesIndex,jsonIndex,colLength) {
  var notesRange = sheet.getRange(3,notesIndex,colLength,1);
  var notesRangeName = sheet.getName().replace('-','_') + '_notes';
  SpreadsheetApp.getActiveSpreadsheet().setNamedRange(notesRangeName, SpreadsheetApp.getActiveSpreadsheet().getRange(sheet.getName() + '!' + notesRange.getA1Notation()));
  var jsonRange = sheet.getRange(3,jsonIndex,colLength,1);
  var jsonRangeName = sheet.getName().replace('-','_') + '_json';
  SpreadsheetApp.getActiveSpreadsheet().setNamedRange(jsonRangeName, SpreadsheetApp.getActiveSpreadsheet().getRange(sheet.getName() + '!' + jsonRange.getA1Notation()));
}

function createHeaders(sheet, labels, title) {
  var headerRange = sheet.getRange(1,1,1,labels.length);
  headerRange.mergeAcross();
  headerRange.setValue(title);
  headerRange.setBackground('#1155cc');
  headerRange.setFontWeight('bold');
  headerRange.setFontColor('white');
  
  var labelsRange = sheet.getRange(2,1,1,labels.length);
  labelsRange.setValues([labels]);
  labelsRange.setFontWeight('bold');
}

function buildTriggerSheet(containerObj) {
  var sheetName = containerObj.containerPublicId + '_triggers';
  var sheet = insertSheet(sheetName);
  
  var triggerLabels = ['Trigger name', 'Trigger ID', 'Trigger type', 'Folder ID', 'Last modified', 'Notes', 'JSON'];

  createHeaders(sheet, triggerLabels, 'Triggers for container ' + containerObj.containerPublicId + ' (' + containerObj.containerName + ').');

  sheet.setColumnWidth(1, 305);
  sheet.setColumnWidth(2, 75);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 75);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 305);
  sheet.setColumnWidth(7, 100);
  
  var triggersObject = formatTriggers(containerObj.triggers);
  if (triggersObject.length) {
    var dataRange = sheet.getRange(3,1,triggersObject.length,triggerLabels.length);
    dataRange.setValues(triggersObject);
  
    setNamedRanges(sheet,triggerLabels.indexOf('Notes') + 1,triggerLabels.indexOf('JSON') + 1,triggersObject.length);
  
    var formats = triggersObject.map(function(a) {
      return ['@', '@', '@', '@', 'dd/mm/yy at h:mm', '@', '@'];
    });
    dataRange.setNumberFormats(formats);
    dataRange.setHorizontalAlignment('left');
  }
}

function buildVariableSheet(containerObj) {
  var sheetName = containerObj.containerPublicId + '_variables';
  var sheet = insertSheet(sheetName);
  
  var variableLabels = ['Variable name', 'Variable ID', 'Variable type', 'Folder ID', 'Last modified', 'Notes', 'JSON'];

  createHeaders(sheet, variableLabels, 'Variables for container ' + containerObj.containerPublicId + ' (' + containerObj.containerName + ').');

  sheet.setColumnWidth(1, 305);
  sheet.setColumnWidth(2, 75);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 75);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 305);
  sheet.setColumnWidth(7, 100);
  
  var variablesObject = formatVariables(containerObj.variables);
  if (variablesObject.length) {
    var dataRange = sheet.getRange(3,1,variablesObject.length,variableLabels.length);
    dataRange.setValues(variablesObject);
  
    setNamedRanges(sheet,variableLabels.indexOf('Notes') + 1,variableLabels.indexOf('JSON') + 1,variablesObject.length);
  
    var formats = variablesObject.map(function(a) {
      return ['@', '@', '@', '@', 'dd/mm/yy at h:mm', '@', '@'];
    });
    dataRange.setNumberFormats(formats);
    dataRange.setHorizontalAlignment('left');
  }
}

function buildTagSheet(containerObj) {
  var sheetName = containerObj.containerPublicId + '_tags';
  var sheet = insertSheet(sheetName);
  
  var tagLabels = ['Tag name', 'Tag ID', 'Tag type', 'Folder ID', 'Last modified', 'Firing trigger IDs', 'Exception trigger IDs', 'Setup tag', 'Cleanup tag', 'Notes', 'JSON'];

  createHeaders(sheet, tagLabels, 'Tags for container ' + containerObj.containerPublicId + ' (' + containerObj.containerName + ').');

  sheet.setColumnWidth(1, 305);
  sheet.setColumnWidth(2, 75);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 75);
  sheet.setColumnWidth(5, 130);
  sheet.setColumnWidth(6, 150);
  sheet.setColumnWidth(7, 150);
  sheet.setColumnWidth(8, 205);
  sheet.setColumnWidth(9, 205);
  sheet.setColumnWidth(10, 305);
  sheet.setColumnWidth(11, 100);
  
  var tagsObject = formatTags(containerObj.tags);
  if (tagsObject.length) {
    var dataRange = sheet.getRange(3,1,tagsObject.length,tagLabels.length);
    dataRange.setValues(tagsObject);

    setNamedRanges(sheet,tagLabels.indexOf('Notes') + 1,tagLabels.indexOf('JSON') + 1,tagsObject.length);
  
    var formats = tagsObject.map(function(a) {
      return ['@', '@', '@', '@', 'dd/mm/yy at h:mm', '@', '@', '@', '@', '@', '@'];
    });
    dataRange.setNumberFormats(formats);
    dataRange.setHorizontalAlignment('left');
  }
}

function buildContainerSheet(containerObj) {
  var sheetName = containerObj.containerPublicId + '_container';
  var sheet = insertSheet(sheetName);
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 340);
  
  var containerHeader = sheet.getRange(1,1,1,2);
  containerHeader.setValues([['Google Tag Manager documentation','']]);
  containerHeader.mergeAcross();
  containerHeader.setBackground('#1155cc');
  containerHeader.setFontWeight('bold');
  containerHeader.setHorizontalAlignment('center');
  containerHeader.setFontColor('white');
  
  var containerLabels = ['Container ID:', 'Container name:', 'Container notes:', 'Latest version ID:', 'Version name:', 'Version description:', 'Version created/published:', 'Link to container:', 'API path:'];
  
  var containerContent = sheet.getRange(2,1,containerLabels.length,2);
  containerContent.setValues([
    [containerLabels[0], containerObj.containerPublicId],
    [containerLabels[1], containerObj.containerName],
    [containerLabels[2], containerObj.containerNotes],
    [containerLabels[3], containerObj.versionId],
    [containerLabels[4], containerObj.versionName],
    [containerLabels[5], containerObj.versionDescription],
    [containerLabels[6], containerObj.versionCreatedOrPublished],
    [containerLabels[7], containerObj.containerLink],
    [containerLabels[8], 'accounts/' + containerObj.accountId + '/containers/' + containerObj.containerId + '/versions/' + containerObj.versionId]
  ]);
  containerContent.setBackgrounds([
    ['white', 'white'],
    ['#e8ebf8', '#e8ebf8'],
    ['white', 'white'],
    ['#e8ebf8', '#e8ebf8'],
    ['white', 'white'],
    ['#e8ebf8', '#e8ebf8'],
    ['white', 'white'],
    ['#e8ebf8', '#e8ebf8'],
    ['white', 'white']    
  ]);
  containerContent.setNumberFormats([
    ['@', '@'],
    ['@', '@'],
    ['@', '@'],
    ['@', '@'],
    ['@', '@'],    
    ['@', '@'],
    ['@', 'dd/mm/yy at h:mm'],
    ['@', '@'],
    ['@', '@']
  ]);
  containerContent.setVerticalAlignment('top');
  
  var containerLabelCol = sheet.getRange(2,1,containerLabels.length,1);
  containerLabelCol.setFontWeight('bold');
  containerLabelCol.setHorizontalAlignment('right');
  
  var containerDataCol = sheet.getRange(2,2,containerLabels.length,1);
  containerDataCol.setHorizontalAlignment('left');

  var emptyCellFix = sheet.getRange(2,3,containerLabels.length,1);
  var emptyCells = [];
  for (var i = 0; i < containerLabels.length; i++) {
    emptyCells.push([' ']);
  }
  emptyCellFix.setValues(emptyCells);
  
  var overviewHeader = sheet.getRange(1,4,1,8);
  overviewHeader.setValues([['Overview of contents', '', '', '', '', '', '', '']]);
  overviewHeader.mergeAcross();
  overviewHeader.setBackground('#85200c');
  overviewHeader.setFontWeight('bold');
  overviewHeader.setHorizontalAlignment('center');
  overviewHeader.setFontColor('white');
  
  var overviewSubHeader = sheet.getRange(2,4,1,8);
  overviewSubHeader.setValues([['Tag type', 'Quantity', 'Trigger type', 'Quantity', 'Variable type', 'Quantity', 'Folder ID', 'Folder name']]);
  overviewSubHeader.setHorizontalAlignments([['right','left','right','left','right','left', 'right', 'left']]);
  overviewSubHeader.setFontWeight('bold');
  overviewSubHeader.setBackground('#e6d6d6');
  
  var tags = getAssetOverview(containerObj.tags);
  var tagsRange = sheet.getRange(3,4,tags.sortedlist.length,2);
  var tagsSum = tags.sum;
  tagsRange.setValues(tags.sortedlist);
  sheet.getRange(3,4,tags.sortedlist.length,1).setHorizontalAlignment('right');
  sheet.getRange(3,5,tags.sortedlist.length,1).setHorizontalAlignment('left');

  var triggers = getAssetOverview(containerObj.triggers);
  var triggersRange = sheet.getRange(3,6,triggers.sortedlist.length,2);
  var triggersSum = triggers.sum;
  triggersRange.setValues(triggers.sortedlist);
  sheet.getRange(3,6,triggers.sortedlist.length,1).setHorizontalAlignment('right');
  sheet.getRange(3,7,triggers.sortedlist.length,1).setHorizontalAlignment('left');

  var variables = getAssetOverview(containerObj.variables);
  var variablesRange = sheet.getRange(3,8,variables.sortedlist.length,2);
  var variablesSum = variables.sum;
  variablesRange.setValues(variables.sortedlist);
  sheet.getRange(3,8,variables.sortedlist.length,1).setHorizontalAlignment('right');
  sheet.getRange(3,9,variables.sortedlist.length,1).setHorizontalAlignment('left');
  
  var folders = containerObj.folders.map(function(folder) {
    return [folder.folderId, folder.name];
  });
  if (folders.length) {
    var foldersRange = sheet.getRange(3,10,folders.length,2);
    foldersRange.setValues(folders);
  }
  
  var contentLength = Math.max(tags.sortedlist.length, variables.sortedlist.length, triggers.sortedlist.length, folders.length);
  var totalRow = sheet.getRange(contentLength + 3, 4, 1, 8);
  totalRow.setValues([
    ['Total tags:', tagsSum, 'Total triggers:', triggersSum, 'Total variables:', variablesSum, '', '']
  ]);
  totalRow.setHorizontalAlignments([['right', 'left', 'right', 'left', 'right', 'left', 'right', 'left']]);
  totalRow.setFontWeight('bold');
  totalRow.setBackground('#e6d6d6');
}

function startProcess(aid, cid) {
  var latestVersionId = fetchLatestVersionId(aid, cid);
  if (latestVersionId === '0') { throw new Error('No latest version found!'); }
  var latestVersion = fetchLatestVersion(aid, cid, latestVersionId);
  var containerObj = {
    accountId: latestVersion.container.accountId,
    containerId: latestVersion.container.containerId,
    containerName: latestVersion.container.name,
    containerPublicId: latestVersion.container.publicId,
    containerNotes: latestVersion.container.notes || '',
    containerLink: latestVersion.container.tagManagerUrl,
    versionName: latestVersion.name || '',
    versionId: latestVersion.containerVersionId,
    versionDescription: latestVersion.description || '',
    versionCreatedOrPublished: new Date(parseInt(latestVersion.fingerprint)),
    tags: latestVersion.tag || [],
    variables: latestVersion.variable || [],
    triggers: latestVersion.trigger || [],
    folders: latestVersion.folder || []
  };
  buildContainerSheet(containerObj);
  buildTagSheet(containerObj);
  buildTriggerSheet(containerObj);
  buildVariableSheet(containerObj);
}

function fetchLatestVersion(aid, cid, vid) {
  var parent = 'accounts/' + aid + '/containers/' + cid + '/versions/' + vid;
  return TagManager.Accounts.Containers.Versions.get(parent);
}

function fetchLatestVersionId(aid, cid) {
  var parent = 'accounts/' + aid + '/containers/' + cid;
  return TagManager.Accounts.Containers.Version_headers.latest(parent, {
    fields: 'containerVersionId'
  }).containerVersionId;
}

function fetchAccounts() {
  return TagManager.Accounts.list({
    fields: 'account(accountId,name)'
  }).account;
}

function fetchContainers(aid) {
  var parent = 'accounts/' + aid;
  return TagManager.Accounts.Containers.list(parent, {
    fields: 'container(accountId,containerId,publicId,name)'
  }).container;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
    .getContent();
}

function openContainerSelector() {
  var ui = SpreadsheetApp.getUi();
  var html = HtmlService.createTemplateFromFile('ContainerSelector').evaluate().setWidth(400).setHeight(220);
  SpreadsheetApp.getUi().showModalDialog(html, 'Select Container');
}

function openNotesModal() {
  var ui = SpreadsheetApp.getUi();
  var html = HtmlService.createTemplateFromFile('NotesModal').evaluate().setWidth(400).setHeight(150);
  SpreadsheetApp.getUi().showModalDialog(html, 'Process Notes');
}

function onOpen() {
  var menu = SpreadsheetApp.getUi().createAddonMenu();
  menu.addItem('Build documentation', 'openContainerSelector');
  menu.addItem('Process notes', 'openNotesModal');
  menu.addToUi();
}
