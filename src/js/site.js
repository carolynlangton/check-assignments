const config = {
    "version": "1.0.0",
    "dataRoot": "data/",
    "daysToRememberProgress": 60
};

$(document).ready(function () {
    const appId = 'check',
        listTypes = ['1', 'A']; // Uses HTML list types

    var completedTasks = [],
        dataSetId = 'unknown',
        totalProgressPoints = 0,
        completedProgressPoints = 0,
        taskPpMap = {},
        dataParameter = getUrlParameter('d'),
        dataFile = '',
        emphasizeRootTasks = false,
        supportsLocalStorage = supports_html5_storage();

    $('.print-btn').click(function () {
        window.print();
    });

    $('.dark-theme-btn').click(function () {
        applyTheme('dark');
    });

    $('.light-theme-btn').click(function () {
        applyTheme('light');
    });

    $('.tutorial-btn').click(function () {
        runTutorial();
    });

    // If the appropriate URL param is found, clear the app's local storage.
    if (getUrlParameter('wipe') === "true") {
        clearLocalStorage();
    }

    cleanUpOldProgress();

    // Update the site theme based on user settings (or lack there of).
    var theme = getProperty('theme');
    applyTheme(theme ? theme : 'light');

    // Check to see if the data parameter is supplied before trying to load the data file.
    if (dataParameter) {
        dataFile = config.dataRoot + dataParameter + '.json';

        $.getJSON(dataFile + '?t=' + Date.now(), function (dataSet) {
            dataSetId = dataSet.id;
            emphasizeRootTasks = dataSet.emphasizeRootTasks;

            $('#dynamicContentContainer').html(generateHtml(dataSet));

            $('.page-title').html(dataSet.name);

            initializeTaskStatuses(getCompletedTasks());

            $('.complete-check').click(function () {
                updateTaskStatus($(this).parent().parent().attr('id'), false);
            });

            $('.incomplete-check').click(function () {
                updateTaskStatus($(this).parent().parent().attr('id'), true);
            });
        }).fail(function () {
            $('#dynamicContentContainer').html('<div class="alert alert-danger" role="alert"><strong>Oh snap!</strong> Failed to load data set.</div>');
        }).always(function () {
            $('.loaded-content').show();
            $('.loading-overlay').remove();

            // If the tutorial hasn't been viewed, show it.
            if (!getProperty('viewedTutorial')) {
                // Not sure why this needs to be in a timeout, but with out it the tooltips are misplaced.
                setTimeout(function () {
                    runTutorial();
                }, 1);
            }
        });
    }
    else {
        $('#dynamicContentContainer').html('<div class="alert alert-warning" role="alert"><strong>Whoops!</strong> No parameter supplied. Check to make sure that the URL is correct.</div>');

        $('.loaded-content').show();
        $('.loading-overlay').remove();
    }

    function runTutorial() {
        var checkboxElem = $($('i.incomplete-check:visible,i.complete-check:visible').first());
        // Check if there is a checkbox element found.
        if (checkboxElem.length) {
            var progressElem = $('.progress');

            // Set the title of the progress tooltip.
            progressElem.attr('title', 'Overall progress will be shown here');

            // Show tooltips.
            checkboxElem.tooltip({ trigger: 'manual' }).tooltip('show').on('mouseover', function () { $(this).tooltip('destroy'); });
            progressElem.tooltip({ placement: 'bottom', trigger: 'manual' }).tooltip('show').on('mouseover', function () { $(this).tooltip('destroy'); });
        }

        // Set the property to indicate the user has seen the tutorial.
        setProperty('viewedTutorial', true);
    }

    function applyTheme(theme) {
        if (theme === 'dark') {
            // Apply theming to header
            $('nav.navbar').addClass('navbar-inverse');
            $('nav.navbar').removeClass('navbar-default');

            // Apply theming to body
            $('body').addClass('darktheme');

            $('.dark-theme-btn').hide();
            $('.light-theme-btn').show();
        }
        else {
            // Apply theming to header
            $('nav.navbar').addClass('navbar-default');
            $('nav.navbar').removeClass('navbar-inverse');

            // Apply theming to body
            $('body').removeClass('darktheme');

            $('.light-theme-btn').hide();
            $('.dark-theme-btn').show();
        }

        // Store selected theme.
        setProperty('theme', theme);

        // This is for the chrome/webkit bug noted here: http://stackoverflow.com/questions/32980358/li-marker-character-color-not-updating-in-chrome
        // and here http://stackoverflow.com/questions/20735133/css-chrome-not-updating-center-position-when-using-position-fixed
        $('#dynamicContentContainer').hide();
        setTimeout(function () {
            $('#dynamicContentContainer').show();
        }, 1);
    }

    function getUrlParameter(sParam) {
        var sPageURL = decodeURIComponent(window.location.search.substring(1)),
            sURLVariables = sPageURL.split('&'),
            sParameterName,
            i;

        for (i = 0; i < sURLVariables.length; i++) {
            sParameterName = sURLVariables[i].split('=');

            if (sParameterName[0] === sParam) {
                return sParameterName[1] === undefined ? true : sParameterName[1];
            }
        }
    }

    function initializeTaskStatuses(loadedCompletedTasks) {
        var i = 0;
        while (i < loadedCompletedTasks.length) {
            // Confirm that the task ID we're trying to mark complete is (still) part of this data set.
            if (taskPpMap[loadedCompletedTasks[i]] != null) {
                updateTaskStatus(loadedCompletedTasks[i], true);
            }

            i++;
        }

        updateProgressBar();
    }

    function updateProgressBar() {
        var percent = 0;

        if (totalProgressPoints > 0) {
            percent = completedProgressPoints / totalProgressPoints * 100;

            // Round
            percent = Math.round(percent * 10) / 10;
        }

        if (percent > 100) {
            percent = 100;
        }

        // Update the progress bar
        $('.progress-bar').attr('aria-valuenow', percent);
        $('.progress-bar').css('width', percent + '%');

        // Update the title (hover) for the progress bar
        $('.progress').attr('title', percent + '%');
    }

    function updateTaskStatus(taskId, completed, skipChildrenUpdate) {
        skipChildrenUpdate = typeof skipChildrenUpdate !== 'undefined' ? skipChildrenUpdate : false;

        const completeAlertClass = 'alert-success',
            completeSpanClass = 'complete-check',
            incompleteSpanClass = 'incomplete-check';

        var panelElement = $('#' + taskId + ' > div.alert');

        if (completed) {
            if (!taskCompleted(taskId)) {
                // Update the completed tasks
                completedTasks.push(taskId);

                // Check to make sure the task is listed in the progress point map
                if (taskPpMap[taskId]) {
                    // Update the progress points
                    completedProgressPoints += taskPpMap[taskId];
                }

                // Update the task UI
                $(panelElement).addClass(completeAlertClass);
            }
        }
        else {
            var idx = completedTasks.indexOf(taskId)
            if (idx !== -1) {
                // Update the completed tasks
                completedTasks.splice(idx, 1);

                // Check to make sure the task is listed in the progress point map
                if (taskPpMap[taskId]) {
                    // Update the progress points
                    completedProgressPoints -= taskPpMap[taskId];
                }

                // Update the task UI
                $(panelElement).removeClass(completeAlertClass);
            }
        }

        setCompletedTasks(completedTasks);

        // Update the visiblity of the checked/unchecked icons
        $(panelElement.selector + ' > i.' + (completed ? incompleteSpanClass : completeSpanClass)).hide();
        $(panelElement.selector + ' > i.' + (completed ? completeSpanClass : incompleteSpanClass)).show();

        // When a parent tasks is updated, update its children
        if (!skipChildrenUpdate) {
            var taskChildren = getTaskChildren(taskId);

            for (var i = 0; i < taskChildren.length; i++) {
                if (completed && !taskCompleted(taskChildren[i]) || !completed && taskCompleted(taskChildren[i])) {
                    updateTaskStatus(taskChildren[i], completed);
                }
            }
        }

        // When a child task is updated, update its parent if needed
        var parentTaskId = getTaskParent(taskId);
        if (parentTaskId) {
            var updateParent = true;
            var taskSiblings = getTaskSiblings(taskId);
            
            // Loop through the tasks siblings to see if they are all checked or unchecked to determine if the parent should be updated.
            for (var i = 0; i < taskSiblings.length; i++) {
                if (completed === taskCompleted(taskSiblings[i])) {
                        updateParent = true;

                        // If the task is not completed then break out when a sibling is found that is also not completed to update the parent to be unchecked.
                        if (!completed) {
                            break;
                        }
                    }
                    else {
                        updateParent = false;

                        // If the task is completed then break out when a sibling is found to have a different status to leave the parent with its current status.
                        if (completed) {
                            break;
                        }
                    }
            }

            if (updateParent) {
                updateTaskStatus(parentTaskId, completed, true);
            }
        }

        updateProgressBar();
    }

    function getTaskSiblings(taskId) {
        var siblingIds = [],
            parentTaskId = getTaskParent(taskId);

        for (var t in taskPpMap) {
            if (parentTaskId === getTaskParent(t)) {
                siblingIds.push(t);
            }
        }

        return siblingIds;
    }

    function getTaskParent(taskId) {
        var parentId = taskId.substring(0, taskId.lastIndexOf("-"));

        return parentId !== '' ? parentId : null;
    }

    function getTaskChildren(taskId) {
        var childrenIds = [];

        for (var t in taskPpMap) {
            if (getTaskParent(t) === taskId) {
                childrenIds.push(t);
            }
        }

        return childrenIds;
    }

    function taskCompleted(taskId) {
        return completedTasks.indexOf(taskId) !== -1;
    }

    function generateHtml(data) {
        var htmlArray = [];

        if (data.description) {
            htmlArray.push('<div class="description">' + data.description + '</div>')
        }

        if (data.notice) {
            htmlArray.push('<div class="alert alert-warning"><strong>Notice:&nbsp;</strong>' + data.notice + '</div>')
        }

        generateTasksHtml(data.tasks, htmlArray);

        return htmlArray.join('');
    }

    function generateTasksHtml(tasks, taskHtml, listType) {
        var idx = 0;

        taskHtml.push('<ol type="' + getNextListType(listType) + '">');

        while (idx < tasks.length) {
            var taskElmId = tasks[idx].id;
            // If checkable is specified use that value, otherwise default to true
            var taskCheckable = tasks[idx].checkable != null ? tasks[idx].checkable : true;
            // If progress points is specified use that value, otherwise default to 1
            var taskProgressPoints = tasks[idx].progressPoints != null ? tasks[idx].progressPoints : 1;

            // Only add the task to the map and increase the progress points if the task is checkable
            if (taskCheckable) {
                // Increment the progress points.
                totalProgressPoints += taskProgressPoints;

                // Add the task to the map
                taskPpMap[taskElmId] = taskProgressPoints;
            }

            // Emphasize root tasks if specified.
            if (emphasizeRootTasks && !getTaskParent(tasks[idx].id)) {
                taskHtml.push('<hr>');
            }

            taskHtml.push('<li id="' + taskElmId + '">');

            taskHtml.push('<div class="alert task-alert">');

            // Only include the checked/unchecked icons if the task is checkable
            if (taskCheckable) {
                taskHtml.push('<i class="incomplete-check fa fa-square-o fa-lg" aria-hidden="true" title="Click to mark task complete or incomplete"></i>');
                taskHtml.push('<i class="complete-check fa fa-check-square-o fa-lg" aria-hidden="true" title="Click to mark task complete or incomplete" style="display: none;"></i>');
            }

            // If there is an icon specified for the task, add it.
            if (tasks[idx].icon) {
                taskHtml.push('<i class="fa ' + tasks[idx].icon + ' fa-lg"></i>');
            }
            
            taskHtml.push('<span class="task">' + tasks[idx].description + '</span>');

            if (tasks[idx].items && tasks[idx].items.length > 0) {
                var itemIdx = 0;

                while (itemIdx < tasks[idx].items.length) {
                    taskHtml.push('<div class="task-item-container">');

                    // If there is an icon specified for the item, add it.
                    if (tasks[idx].items[itemIdx].icon) {
                        taskHtml.push('<i class="fa ' + tasks[idx].items[itemIdx].icon + ' fa-lg"></i>');
                    }
                    
                    switch (tasks[idx].items[itemIdx].type) {
                        case "text":
                            taskHtml.push('<span>' + tasks[idx].items[itemIdx].content + '</span>');
                            break;
                        
                        case "raw":
                            taskHtml.push('<pre>' + tasks[idx].items[itemIdx].content + '</pre>');
                            break;
                        case "image":
                            taskHtml.push('<img src="' + getArtifactUrl(tasks[idx].items[itemIdx].imageFile) + '" class="img-thumbnail" style="height: auto; width: ' +
                                (tasks[idx].items[itemIdx].width ? tasks[idx].items[itemIdx].width + 'px' : 'auto') + ';" alt="' +
                                tasks[idx].items[itemIdx].altText + '" title="' + tasks[idx].items[itemIdx].altText + '"/>');

                            break;
                        case "download":
                            taskHtml.push('<a href="' + getArtifactUrl(tasks[idx].items[itemIdx].file) + '" download>' + tasks[idx].items[itemIdx].description + ' (download)</a>');

                            break;
                        case "link":
                            taskHtml.push('<a href="' + tasks[idx].items[itemIdx].location + '" target="_blank">' + tasks[idx].items[itemIdx].description + '</a>');

                            break;
                    }

                    taskHtml.push('</div>');

                    itemIdx++;
                }
            }

            if (tasks[idx].tasks && tasks[idx].tasks.length > 0) {
                // Clone array and recursive call
                generateTasksHtml(tasks[idx].tasks.slice(), taskHtml, getNextListType(listType));
            }

            taskHtml.push('</div>');
            taskHtml.push('</li>');

            idx++;
        }

        taskHtml.push('</ol>');

        return taskHtml;
    }

    function getArtifactUrl(specifiedValue) {
        var retVal = specifiedValue;

        // Check if the file is specified with just a file name.
        if (!isUrl(specifiedValue)) {
            // Build the path up based on the relative path (parrallel to the loaded data file) and the file name.
            retVal = dataFile.substr(0, dataFile.lastIndexOf('/') + 1) + specifiedValue;
        }

        return retVal;
    }

    function isUrl(str) {
        // TODO: Build in better detection - regex?.
        if (str.indexOf('http:') === 0 || str.indexOf('https:') === 0) {
            return true;
        }

        return false;
    }

    function getNextListType(currentlListType) {
        var currIdx = listTypes.indexOf(currentlListType);

        if (currIdx != -1 && currIdx < (listTypes.length - 1)) {
            return listTypes[currIdx + 1];
        }

        return listTypes[0];
    }

    function getCompletedTasks() {
        var dataSetData = getDataSetData();

        return dataSetData.completedTasks;
    }

    function setCompletedTasks(tasks) {
        var dataSetData = getDataSetData();

        dataSetData.updatedDate = Date();
        dataSetData.completedTasks = tasks;

        setDataSetData(dataSetData);
    }

    function getDataSetData() {
        var progressObj = getProperty('progress');

        // Ensure that the value is an object.
        if (!progressObj) {
            progressObj = {};
        }

        if (!progressObj[dataSetId]) {
            progressObj[dataSetId] = {
                "updatedDate": 0,
                "completedTasks": []
            };
        }

        return progressObj[dataSetId];
    }

    function setDataSetData(dataSetData) {
        var progressObj = getProperty('progress');

        // Ensure that the value is an object.
        if (!progressObj) {
            progressObj = {};
        }

        progressObj[dataSetId] = dataSetData;

        setProperty('progress', progressObj);
    }

    function cleanUpOldProgress() {
        var progressObj = getProperty('progress'),
            expiredItems = [],
            expirationDate = new Date();

        // Ensure that the value is an object.
        if (!progressObj) {
            progressObj = {};
        }

        // Get the expiration date
        expirationDate.setDate(expirationDate.getDate() - config.daysToRememberProgress);

        for (var prop in progressObj) {
            var propUpdatedDate = new Date(progressObj[prop].updatedDate);

            if (propUpdatedDate < expirationDate) {
                expiredItems.push(prop);
            }
        }

        var delIdx = 0;
        while (delIdx < expiredItems.length) {
            // Remove the expired item
            delete progressObj[expiredItems[delIdx]];

            delIdx++;
        }

        setProperty('progress', progressObj);
    }

    function getProperty(name) {
        var lsObj = getAppLocalStorage();

        return !lsObj[name] ? null : lsObj[name];
    }

    function setProperty(name, value) {
        var lsObj = getAppLocalStorage();

        lsObj[name] = value;

        setAppLocalStorage(lsObj);
    }

    function clearLocalStorage() {
        setAppLocalStorage({});
    }

    function getAppLocalStorage() {
        var rtn = {};

        if (supportsLocalStorage && localStorage[appId] != null) {
            rtn = JSON.parse(localStorage.getItem(appId));
        }

        return rtn;
    }

    function setAppLocalStorage(obj) {
        if (supportsLocalStorage) {
            localStorage.setItem(appId, JSON.stringify(obj));
        }
    }

    // Check if local storage is supported
    function supports_html5_storage() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    }
});