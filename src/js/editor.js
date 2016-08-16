/*global $*/
"use strict";

const editorConfig = {
    "animationSpeed": 300,
    "supportedIcons": [
        'fa-adjust',
        'fa-anchor',
        'fa-bell',
        'fa-cog',
        'fa-cogs',
        'fa-download',
        'fa-dot-circle-o',
        'fa-ban',
        'fa-balance-scale',
        'fa-pie-chart',
        'fa-area-chart',
        'fa-university',
        'fa-building-o',        
        'fa-home',
        'fa-binoculars',
        'fa-book',
        'fa-link',
        'fa-trash-o',
        'fa-paperclip',
        'fa-briefcase',
        'fa-camera',
        'fa-comments-o',
        'fa-cube',
        'fa-download',
        'fa-external-link',
        'fa-film',
        'fa-flask',
        'fa-bolt',
        'fa-gamepad',
        'fa-trophy',
        'fa-users',
        'fa-user',
        'fa-history',
        'fa-sticky-note-o',
        'fa-thumb-tack',
        'fa-info',
        'fa-exclamation-triangle',
        'fa-question',
        'fa-key',
        'fa-lock',
        'fa-unlock-alt',
        'fa-music',
        'fa-television',
        'fa-tag',
        'fa-wrench'
    ]
};

var rootTasks = [],
    isAssignmentDirty = false,
    assignmentSettings = null;

$(document).ready(function () {
    window.onbeforeunload = function (e) {
        if (isAssignmentDirty) {
            var confirmationMsg = 'You have unsaved changes. Are you user you want to close the editor?';

            e = e || window.event;

            // For IE and Firefox prior to version 4
            if (e) {
                e.returnValue = confirmationMsg;
            }

            // For Safari
            return confirmationMsg;
        }
    };

    // Add root task event hander.
    $('ol.root-list > li.new-task > .add-task-btn').click(function () {
        var taskWid = new TaskWidget(rootTasks);

        // Add task to list.
        rootTasks.push(taskWid);

        // Add task to DOM.
        $('ol.root-list > li.new-task').before('<li class="task"></li>');
        taskWid.insert($('ol.root-list > li.task').last());

        $('ol.root-list > li.task').last().hide().show(editorConfig.animationSpeed);

        // Scroll to add root task button.
        scrollToElement('ol.root-list > li.new-task');
    });

    // New assignment event handler.
    $('.new-btn').click(function (e) {
        openDynamicModal('Confirmation', '<p>Are you sure you want to start a new assignment?</p><p>Any unsaved changes will be lost.</p>', function () {
            window.location.reload(); // An ugly hack.
        });

        e.preventDefault();
    });

    // Download event handler.
    $('.download-btn').click(function (e) {
        $("<a />", {
            "download": "assignment.json",
            "href": "data:text/json," + encodeURIComponent(JSON.stringify(generateData()))
        }).appendTo("body")
        .click(function () {
            $(this).remove();
        })[0].click();

        e.preventDefault();
    });

    // Upload event handler.
    $('.upload-btn').click(function (e) {
        $('.uploaded-file').click();

        e.preventDefault();
    });

    $(".uploaded-file").change(function () {
        loadDataFile($(this)[0].files[0]);
    });

    // Setup the drag and drop events.
    var dropArea = document.getElementsByTagName('html')[0];
    dropArea.addEventListener('dragover', handleFileDragOver, false);
    dropArea.addEventListener('drop', handleFileDrop, false);

    $('.assignment-properties-btn').click(function (e) {
        openFormModal(
            'Assignment Properties',
            [
                {
                    "id": "name",
                    "type": "text",
                    "name": "Name",
                    "value": assignmentSettings.name,
                    "placeholder": "Assignment 1.1",
                    "tooltip": ['The name of the assignment that will be displayed.']
                },
                {
                    "id": "description",
                    "type": "multiline",
                    "name": "Description",
                    "value": assignmentSettings.description,
                    "placeholder": "In this assignment...",
                    "tooltip": ['The description of the assignment that will be displayed.']
                },
                {
                    "id": "notice",
                    "type": "multiline",
                    "name": "Notice",
                    "value": assignmentSettings.notice,
                    "placeholder": "Make sure that you...",
                    "tooltip": ['An optional noticed that will be displayed.']
                },
                {
                    "id": "emphasizeRootTasks",
                    "type": "bool",
                    "name": "Emphasize First-Level Tasks",
                    "value": assignmentSettings.emphasizeRootTasks,
                    "placeholder": "",
                    "tooltip": ['Determines if all of the first-level tasks will be displayed to stand out more from the rest of the tasks.']
                }
            ],
            null,
            function (results) {
                assignmentSettings.name = results.name;
                assignmentSettings.description = results.description;
                assignmentSettings.notice = results.notice;
                assignmentSettings.emphasizeRootTasks = results.emphasizeRootTasks;
            });

        e.preventDefault();
    });

    initialize();
});

var initialize = function () {
    // Default assignment settings
    assignmentSettings = {
        "id": generateId(8),
        "name": "",
        "description": "",
        "notice": "",
        "emphasizeRootTasks": false
    };

    // Delete any existing tasks.
    // Delete in reverse - since items are being removed from the iterated list.
    for (var i = rootTasks.length - 1; i >= 0; i--) {
        rootTasks[i].delete();
    }
};

var generateData = function () {
    var data = {};

    data.id = assignmentSettings.id;
    data.name = assignmentSettings.name;
    data.description = assignmentSettings.description;
    data.notice = assignmentSettings.notice;
    data.emphasizeRootTasks = assignmentSettings.emphasizeRootTasks;
    data.tasks = [];

    for (var i = 0; i < rootTasks.length; i++) {
        data.tasks.push(rootTasks[i].getData());
    }

    return data;
};

// To support drag and drop.
var handleFileDrop = function (e) {
    e.stopPropagation();
    e.preventDefault();

    var tmpFile = e.dataTransfer.files[0];

    openDynamicModal('Confirmation', '<p>Are you sure you want to load this file?</p><p>Any unsaved changes will be lost.</p>', function () {
        loadDataFile(tmpFile);
    });
};

// To support drag and drop.
var handleFileDragOver = function (e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
};

var loadDataFile = function (file) {
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile) {
        return function(e) {
            // Render thumbnail.
            var json = JSON.parse(e.target.result);

            // Clear out uploaded file. This is in case someone uploads the
            // same file again - allowing the 'change' event to fire.
            $(".uploaded-file").val('');

            loadData(json);

            notificationDialog('Success', 'Assignment loaded successfully.');
        };
    })(file);

    // Read in the image file as a data URL.
    reader.readAsText(file);
};

var loadData = function (data) {
    initialize();

    // Scroll to the top of the page.
    scrollToElement('body', 0);

    assignmentSettings.id = data.id != null ? data.id : assignmentSettings.id;
    assignmentSettings.name = data.name != null ? data.name : assignmentSettings.name;
    assignmentSettings.description = data.description != null ? data.description : assignmentSettings.description;
    assignmentSettings.notice = data.notice != null ? data.notice : assignmentSettings.notice;
    assignmentSettings.emphasizeRootTasks = data.emphasizeRootTasks != null ? data.emphasizeRootTasks : assignmentSettings.emphasizeRootTasks;

    for (var i = 0; i < data.tasks.length; i++) {
        var taskWid = new TaskWidget(rootTasks);

        // Add task to list.
        rootTasks.push(taskWid);

        // Add task to DOM.
        $('ol.root-list > li.new-task').before('<li class="task"></li>');
        taskWid.insert($('ol.root-list > li.task').last());

        // Load
        taskWid.load(data.tasks[i]);
    }
};

var notificationDialog = function (title, message, okCallback) {
    var dialogWid = new DialogWidget(title, message, 'OK', false, function () {
        if (okCallback) {
            okCallback();
        }
    });

    dialogWid.insert();
};

var scrollToElement = function (selector, animateDuration) {
    // The offset is the hight of the fixed header on the page.
    var negOffset = 60;

    $('html, body').animate({
        scrollTop: $(selector).offset().top - negOffset
    }, (animateDuration != null ? animateDuration : 500));
};

var generateId = function (length) {
    const characterPool = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';

    for (var i = length; i > 0; --i) {
        result += characterPool[Math.floor(Math.random() * characterPool.length)];
    }

    return result;
};

var openDynamicModal = function (title, markup, callback, eventHookupCallback) {
    var dialogWid = new DialogWidget(title, markup, 'OK', true, function () {
        if (callback) {
            callback(dialogWid.getSelector());
        }
    });

    dialogWid.insert(function () {
        if (eventHookupCallback) {
            eventHookupCallback(dialogWid.getSelector());
        }
    });
};

// dataArray format = [{ "id": "description", "type": "multiline", "name": "Description", "value": "some value", "placeholder": "This assignment..." }]
var openFormModal = function (title, dataArray, message, callback) {
    var markup = [],
        widgets = {};

    if (message) {
        markup.push('<div class="alert alert-info" role="alert">' + message + '</div>');
    }

    markup.push('<form role="form">');

    for (var i = 0; i < dataArray.length; i++) {
        var tooltipMarkup = '';

        if (dataArray[i].tooltip != null) {
            var hasLink = dataArray[i].tooltip[1] != null;

            tooltipMarkup = (hasLink ? '<a href="' + dataArray[i].tooltip[1] + '" target="_blank">' : '') +
                '<span title="' + dataArray[i].tooltip[0] + '" data-toggle="tooltip" data-placement="right"><i class="fa fa-question-circle-o fa-lg"></i></span>' +
                (hasLink ? '</a>' : '');
        }

        switch(dataArray[i].type) {
            case "text":
            case "password":
                markup.push('<div class="form-group">');
                markup.push('<label>' + dataArray[i].name + '</label>');
                markup.push(tooltipMarkup);
                markup.push('<input class="form-control ' + dataArray[i].id + '" placeholder="' + dataArray[i].placeholder + '" value="' + dataArray[i].value +
                    '"' + (dataArray[i].type == 'password' ? ' type="password"' : '') + '>');
                markup.push('</div>');
                break;
            case "icon-selector":
                var iconWid = new IconSelectorWidget(dataArray[i].value);
                widgets[dataArray[i].id] = iconWid;

                markup.push('<div class="form-group">');
                markup.push('<label>' + dataArray[i].name + '</label>');
                markup.push(tooltipMarkup);
                markup.push(iconWid.getHtml());
                markup.push('</div>');
                break;
            case "number":
                markup.push('<div class="form-group">');
                markup.push('<label>' + dataArray[i].name + '</label>');
                markup.push(tooltipMarkup);
                markup.push('<input type="number" class="form-control ' + dataArray[i].id + '" placeholder="' + dataArray[i].placeholder + '" value="' + dataArray[i].value + '">');
                markup.push('</div>');
                break;
            case "bool":
                markup.push('<div class="checkbox">');
                markup.push('<label><input type="checkbox" class="' + dataArray[i].id + '" ' + (dataArray[i].value == true ? 'checked' : '') + ' > <strong>' + dataArray[i].name + '</strong></label>');
                markup.push(tooltipMarkup);
                markup.push('</div>');
                break;
            case "multiline":
                markup.push('<div class="form-group">');
                markup.push('<label>' + dataArray[i].name + '</label>');
                markup.push(tooltipMarkup);
                markup.push('<textarea class="form-control span6 ' + dataArray[i].id + '" rows="2" placeholder="' + dataArray[i].placeholder + '">' + dataArray[i].value + '</textarea>');
                markup.push('</div>');
                break;
        }
    }

    markup.push('</form>');

    openDynamicModal(title, markup.join(''), function (selector) {
        var resultData = {};

        for (var i = 0; i < dataArray.length; i++) {
            switch (dataArray[i].type) {
                case "text":
                case "password":
                    resultData[dataArray[i].id] = $(selector + ' .' + dataArray[i].id).val();
                    break;
                case "icon-selector":
                    resultData[dataArray[i].id] = widgets[dataArray[i].id].getValue();
                    break;
                case "number":
                    resultData[dataArray[i].id] = Number($(selector + ' .' + dataArray[i].id).val());
                    break;
                case "bool":
                    resultData[dataArray[i].id] = $(selector + ' .' + dataArray[i].id).is(':checked');
                    break;
                case "multiline":
                    resultData[dataArray[i].id] = $(selector + ' .' + dataArray[i].id).val();
                    break;
            }
        }

        // Clear out the dialog body contents.
        $(selector).html('');

        if (callback) {
            callback(resultData);
        }
    },
    function (selector) {
        // Hookup any tooltips that might be in the dialog.
        $('[data-toggle="tooltip"]').tooltip();

        // Loop through widgets and hook up each of them.
        for (var widget in widgets) {
            widgets[widget].hookup();
        }
    });
};

var Widget = function () {
    var self = {};

    self.id = generateId(8);
    self.widgetIdAttr = 'widgetId=' + self.id;
    self.html = [];

    self.getSelector = function () {
        return '[' + self.widgetIdAttr + ']';
    };

    self.getHtml = function () {
        return self.html.join('');
    };

    return self;
};

var DialogWidget = function (title, content, okButtonText, cancelButton, okCallback) {
    var self = new Widget();

    self.html.push(
        '<div ' + self.widgetIdAttr + ' class="modal fade" tabindex="-1" role="dialog" aria-labelledby="dynamicModalLabel" aria-hidden="true">' +
            '<div class="modal-dialog" role="document">' +
                '<div class="modal-content">' +
                    '<div class="modal-header">' +
                        '<button type="button" class="close" data-dismiss="modal" aria-label="Close">' +
                            '<span aria-hidden="true">&times;</span>' +
                        '</button>' +
                        '<h4 class="modal-title">' + title + '</h4>' +
                    '</div>' +
                    '<div class="modal-body">' + content + '</div>' +
                    '<div class="modal-footer">' +
                        (cancelButton ? '<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>' : '') +
                        '<button type="button" class="btn btn-primary">' + okButtonText + '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>'
        );

    self.hide = function (callback) {
        $(self.getSelector()).modal('hide');

        if (callback) {
            callback();
        }
    };

    self.destroy = function () {
        $(self.getSelector()).remove();
    };

    self.insert = function (callback) {
        $('body').append(self.getHtml());
        $(self.getSelector()).modal();

        // Primary button click event.
        $(self.getSelector() + ' .btn-primary').click(function () {
            self.hide(okCallback);
        });

        // Dialog close/hidden event.
        $(self.getSelector()).on('hidden.bs.modal', function (e) {
            self.destroy();
        });

        if (callback) {
            callback(self.getSelector());
        }
    };

    return self;
};

var IconSelectorWidget = function (defaultValue) {
    var self = new Widget(),
        selectedIcon = defaultValue;

    const noneSelectorDisplay = '(None)',
        noneMarkup = '<span class="selected-icon">' + noneSelectorDisplay + '</span><i icon=""></i>';

    var getMarkupForIcon = function (icon) {
        return '<i class="fa-lg fa ' + icon + '"></i>';
    };

    self.html.push(
        '<div ' + self.widgetIdAttr + '>' +
            '<div class="dropdown icon-selector">' + 
                '<button class="btn btn-default dropdown-toggle selected-icon" type="button" id="dropdownMenu1" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">' +
                    (editorConfig.supportedIcons.indexOf(defaultValue) != -1 ? getMarkupForIcon(defaultValue) : noneMarkup) + ' <span class="caret"></span>' +
                '</button>' + 
                '<ul class="dropdown-menu fa-icon-selector" aria-labelledby="dropdownMenu1">' +
                    '<li><a href="#" class="none">' + noneSelectorDisplay + '</a></li>' +
                    '<li role="separator" class="divider"></li>'
            );

        for (var i = 0; i < editorConfig.supportedIcons.length; i++) {
            self.html.push('<li><a href="#"><i icon="' + editorConfig.supportedIcons[i] + '" class="fa-lg fa ' + editorConfig.supportedIcons[i] + '"></i></a></li>');
        }
    
        self.html.push(
                '</ul>' + 
            '</div>' +
        '</div>'
        );

    self.hookup = function () {
        // Hookup any icon selectors.
        $(self.getSelector() + ' .fa-icon-selector > li > a').click(function () {
            selectedIcon = $(this).children("i:first").attr("icon");
            $(self.getSelector() + ' .selected-icon').html($(this).html() + ' <span class="caret"></span>');
        });
    };

    self.getValue = function () {
        return selectedIcon;
    };

    return self;
};

var ListItemWidget = function (parentList) {
    var self = new Widget();

    self.menuHtml =
        '<div class="btn-group">' +
            '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown">Actions <span class="caret"></span></button>' +
            '<ul class="dropdown-menu">' +
                '<li><a href="#" class="settings-li-btn">Settings...</a></li>' +
                '<li role="separator" class="divider"></li>' +
                '<li><a href="#" class="moveup-li-btn">Move Up</a></li>' +
                '<li><a href="#" class="movedown-li-btn">Move Down</a></li>' +
                '<li role="separator" class="divider"></li>' +
                '<li><a href="#" class="delete-li-btn">Delete...</a></li>' +
            '</ul>' +
        '</div>';

    var findIndex = function(list, id) {
        var locatedIndex = null;

        for (var i = 0; i < list.length; i++) {
            if (list[i].id == id) {
                locatedIndex = i;
                break;
            }
        }

        return locatedIndex;
    };

    var safeDelete = function () {
        openDynamicModal('Confirmation', '<p>Are you sure you want to delete this?</p><p>This action cannot be undone.</p>', function () {
            // Hide the element with animation.
            $(self.getSelector()).parent().hide(editorConfig.animationSpeed, function () {
                self.delete();
            });
        });
    };

    self.delete = function () {
        // Remove from the list.
        var taskIndex = findIndex(parentList, self.id);
        parentList.splice(taskIndex, 1);

        // Remove from the DOM.
        $(self.getSelector()).parent().remove();
    };

    self.baseInsert = function (selector) {
        $(selector).append('<div ' + self.widgetIdAttr + '>' + self.getHtml() + '</div>');

        // Capture delete task click.
        $(self.getSelector() + ' > .btn-group .delete-li-btn').click(function (e) {
            safeDelete();

            e.preventDefault();
        });

        // Capture move task up click.
        $(self.getSelector() + ' > .btn-group .moveup-li-btn').click(function (e) {
            var taskIndex = findIndex(parentList, self.id);

            // Ensure it is not already first in the list.
            if (taskIndex != 0) {
                // Reorder in the list.
                var removed = parentList.splice(taskIndex, 1);
                parentList.splice(taskIndex - 1, 0, removed[0]);

                // Hide the element with animation.
                $(self.getSelector()).parent().hide(editorConfig.animationSpeed, function () {
                    // Reorder in the DOM.
                    var previousTaskElem = $(self.getSelector()).parent().prev();
                    previousTaskElem.before($(self.getSelector()).parent().detach());

                    // Show the element with animation.
                    $(self.getSelector()).parent().show(editorConfig.animationSpeed);
                });
            }

            e.preventDefault();
        });

        // Capture move task down click.
        $(self.getSelector() + ' > .btn-group .movedown-li-btn').click(function (e) {
            var taskIndex = findIndex(parentList, self.id);

            // Ensure it is not already last in the list.
            if (taskIndex < parentList.length - 1) {
                // Reorder in the list.
                var removed = parentList.splice(taskIndex, 1);
                parentList.splice(taskIndex + 1, 0, removed[0]);

                // Hide the element with animation.
                $(self.getSelector()).parent().hide(editorConfig.animationSpeed, function () {
                    // Reorder in the DOM.
                    var nextTaskElem = $(self.getSelector()).parent().next();
                    nextTaskElem.after($(self.getSelector()).parent().detach());

                    // Show the element with animation.
                    $(self.getSelector()).parent().show(editorConfig.animationSpeed);
                });
            }

            e.preventDefault();
        });
    };

    return self;
};

var TaskWidget = function (parentList) {
    var self = new ListItemWidget(parentList),
        description = '',
        progressPoints = 10, // Default to 10.
        checkable = true,
        icon = '',
        tasks = [],
        items = [];

    self.load = function (loadData) {
        description = loadData.description != null ? loadData.description : description;
        progressPoints = loadData.progressPoints != null ? loadData.progressPoints : progressPoints;
        checkable = loadData.checkable != null ? loadData.checkable : checkable;
        icon = loadData.icon != null ? loadData.icon : icon;

        $(self.getSelector() + ' > .task-description').html(description);

        // Loop through and load items.
        if (loadData.items) {
            for (var i = 0; i < loadData.items.length; i++) {
                var itemWid = null;

                switch (loadData.items[i].type) {
                    case "text":
                        itemWid = new TextItemWidget(items);
                        break;
                    case "raw":
                        itemWid = new RawItemWidget(items);
                        break;
                    case "download":
                        itemWid = new DownloadItemWidget(items);
                        break;
                    case "image":
                        itemWid = new ImageItemWidget(items);
                        break;
                    case "link":
                        itemWid = new LinkItemWidget(items);
                        break;
                }

                // Add item to list.
                items.push(itemWid);

                // Add item to DOM.
                $(self.getSelector() + ' > .item-list').append('<li class="item"></li>');
                itemWid.insert($(self.getSelector() + ' > .item-list > li.item').last());

                // Load item.
                itemWid.load(loadData.items[i]);
            }
        }

        // Loop through and load tasks.
        if (loadData.tasks) {
            for (var i = 0; i < loadData.tasks.length; i++) {
                var taskWid = new TaskWidget(tasks);

                // Add task to list.
                tasks.push(taskWid);

                // Add task to DOM.
                $(self.getSelector() + ' > .task-list').append('<li class="task"></li>');
                taskWid.insert($(self.getSelector() + ' > .task-list > li.task').last());

                // Load task.
                taskWid.load(loadData.tasks[i]);
            }
        }
    };

    self.html.push(
        '<div class="task-description" contenteditable="true" placeholder="Enter task description...">' + description + '</div>' +
        self.menuHtml +
        '<div class="btn-group">' +
            '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown">Add <span class="caret"></span></button>' +
            '<ul class="dropdown-menu">' +
                '<li><a href="#" class="add-subtask-btn">Subtask</a></li>' +
                '<li role="separator" class="divider"></li>' +
                '<li><a href="#" class="add-item-btn text-item-btn">Text Block</a></li>' +
                '<li><a href="#" class="add-item-btn raw-item-btn">Raw Text Block</a></li>' +
                '<li><a href="#" class="add-item-btn link-item-btn">Link</a></li>' +
                '<li><a href="#" class="add-item-btn image-item-btn">Image</a></li>' +
                '<li><a href="#" class="add-item-btn download-item-btn">Download</a></li>' +
            '</ul>' +
        '</div>' +
        '<ul class="item-list"></ul>' +
        '<ol class="task-list"></ol>');

    self.getData = function () {
        var result = {
            "description": $(self.getSelector() + ' > .task-description').html(),
            "progressPoints": progressPoints,
            "checkable": checkable,
            "icon": icon,
            "items": [],
            "tasks": []
        };

        for (var i = 0; i < items.length; i++) {
            result['items'].push(items[i].getData());
        }

        for (var i = 0; i < tasks.length; i++) {
            result['tasks'].push(tasks[i].getData());
        }

        return result;
    };

    self.insert = function (selector) {
        self.baseInsert(selector);

        // Capture settings click.
        $(self.getSelector() + ' > .btn-group .settings-li-btn').click(function (e) {
            openFormModal(
                'Task Settings',
                [
                    {
                        "id": "progressPoints",
                        "type": "number",
                        "name": "Progress Points",
                        "value": progressPoints,
                        "placeholder": "10",
                        "tooltip": ['The weight of this task in the overall assignment progress.']
                    },
                    {
                        "id": "icon",
                        "type": "icon-selector",
                        "name": "Icon",
                        "value": icon,
                        "placeholder": "",
                        "tooltip": ['The icon that will be shown next to this task.']
                    },
                    {
                        "id": "checkable",
                        "type": "bool",
                        "name": "Checkable",
                        "value": checkable,
                        "placeholder": "",
                        "tooltip": ['Determines if this task is able to be checked and unchecked.']
                    }
                ],
                null,
                function (results) {
                    progressPoints = results.progressPoints;
                    checkable = results.checkable;
                    icon = results.icon;
                });

            e.preventDefault();
        });

        // Capture add subtask click.
        $(self.getSelector() + ' > .btn-group .add-subtask-btn').click(function (e) {
            var taskWid = new TaskWidget(tasks);

            // Add task to list.
            tasks.push(taskWid);

            // Add task to DOM.
            $(self.getSelector() + ' > .task-list').append('<li class="task"></li>');
            taskWid.insert($(self.getSelector() + ' > .task-list > li.task').last());

            // Show the element with animation.
            $(self.getSelector() + ' > .task-list > li.task').last().hide().show(editorConfig.animationSpeed);

            e.preventDefault();
        });

        // Capture add item click.
        $(self.getSelector() + ' > .btn-group .add-item-btn').click(function (e) {
            var itemWid = null;

            if ($(this).hasClass('text-item-btn')) {
                itemWid = new TextItemWidget(items);
            }
            else if ($(this).hasClass('raw-item-btn')) {
                itemWid = new RawItemWidget(items);
            }
            else if ($(this).hasClass('link-item-btn')) {
                itemWid = new LinkItemWidget(items);
            }
            else if ($(this).hasClass('image-item-btn')) {
                itemWid = new ImageItemWidget(items);
            }
            else if ($(this).hasClass('download-item-btn')) {
                itemWid = new DownloadItemWidget(items);
            }

            // Add item to list.
            items.push(itemWid);

            // Add item to DOM.
            $(self.getSelector() + ' > .item-list').append('<li class="item"></li>');
            itemWid.insert($(self.getSelector() + ' > .item-list > li.item').last());

            $(self.getSelector() + ' > .item-list > li.item').last().hide().show(editorConfig.animationSpeed);

            e.preventDefault();
        });
    };

    return self;
};

var TextItemWidget = function (parentList) {
    var self = new ListItemWidget(parentList),
        displayName = 'Text Block',
        content = '',
        icon = '';

    self.load = function (loadData) {
        content = loadData.content != null ? loadData.content : content;
        icon = loadData.icon != null ? loadData.icon : icon;

        $(self.getSelector() + ' > .item-content').html(content);
    };

    self.html.push(
        '<h3 class="label label-default">' + displayName + '</h3>' +
        '<div class="item-content" contenteditable="true" placeholder="Enter some text...">' + content + '</div>' +
        self.menuHtml);

    self.getData = function () {
        var result = {
            "type": "text",
            "content": $(self.getSelector() + ' > .item-content').html(),
            "icon": icon
        };

        return result;
    };

    self.insert = function (selector) {
        self.baseInsert(selector);

        // Capture settings click.
        $(self.getSelector() + ' > .btn-group .settings-li-btn').click(function (e) {
            openFormModal(
                displayName + ' Settings',
                [
                    {
                        "id": "icon",
                        "type": "icon-selector",
                        "name": "Icon",
                        "value": icon,
                        "placeholder": "",
                        "tooltip": ['The icon that will be shown next to this item.']
                    }
                ],
                null,
                function (results) {
                    icon = results.icon;
                });

            e.preventDefault();
        });
    };

    return self;
};

var RawItemWidget = function (parentList, loadData) {
    var self = new ListItemWidget(parentList),
        displayName = 'Raw Text Block',
        content = '',
        icon = '';

    self.load = function (loadData) {
        content = loadData.content != null ? loadData.content : content;
        icon = loadData.icon != null ? loadData.icon : icon;

        $(self.getSelector() + ' > .item-content').html(content);
    };

    self.html.push(
        '<h3 class="label label-default">' + displayName + '</h3>' +
        '<div class="item-content" contenteditable="true" placeholder="Enter some text...">' + content + '</div>' +
        self.menuHtml);

    self.getData = function () {
        var result = {
            "type": "raw",
            "content": $(self.getSelector() + ' > .item-content').html(),
            "icon": icon
        };

        return result;
    };

    self.insert = function (selector) {
        self.baseInsert(selector);

        // Capture settings click.
        $(self.getSelector() + ' > .btn-group .settings-li-btn').click(function (e) {
            openFormModal(
                displayName + ' Settings',
                [
                    {
                        "id": "icon",
                        "type": "icon-selector",
                        "name": "Icon",
                        "value": icon,
                        "placeholder": "",
                        "tooltip": ['The icon that will be shown next to this item.']
                    }
                ],
                null,
                function (results) {
                    icon = results.icon;
                });

            e.preventDefault();
        });
    };

    return self;
};

var LinkItemWidget = function (parentList, loadData) {
    var self = new ListItemWidget(parentList),
        displayName = 'Link',
        description = 'Link',
        location = '',
        icon = '';

    self.load = function (loadData) {
        description = loadData.description != null ? loadData.description : description;
        location = loadData.location != null ? loadData.location : location;
        icon = loadData.icon != null ? loadData.icon : icon;

        $(self.getSelector() + ' > div > a').text(description);
    };

    self.html.push(
        '<h3 class="label label-default">'+ displayName + '</h3>' +
        '<div>' +
            '<a href="#" class="display-only-link">' + description + '</a>' +
        '</div>' +
        self.menuHtml);

    self.getData = function () {
        var result = {
            "type": "link",
            "location": location,
            "description": description,
            "icon": icon
        };

        return result;
    };

    self.insert = function (selector) {
        self.baseInsert(selector);

        // Capture settings click.
        $(self.getSelector() + ' > .btn-group .settings-li-btn').click(function (e) {
            openFormModal(
                displayName + ' Settings',
                [
                    {
                        "id": "location",
                        "type": "text",
                        "name": "Location",
                        "value": location,
                        "placeholder": "www.google.com",
                        "tooltip": ['The URL for this link.']
                    },
                    {
                        "id": "description",
                        "type": "text",
                        "name": "Description",
                        "value": description,
                        "placeholder": "Google",
                        "tooltip": ['The text to display to the user for this link.']
                    },
                    {
                        "id": "icon",
                        "type": "icon-selector",
                        "name": "Icon",
                        "value": icon,
                        "placeholder": "",
                        "tooltip": ['The icon that will be shown next to this item.']
                    }
                ],
                'Links will not function within the editor.',
                function (results) {
                    location = results.location;
                    description = results.description;
                    icon = results.icon;

                    $(self.getSelector() + ' > div > a').text(description);
                });

            e.preventDefault();
        });

        // Capture link click.
        $(self.getSelector() + ' a.display-only-link').click(function (e) {
            e.preventDefault();
        });
    };

    return self;
};

var ImageItemWidget = function (parentList, loadData) {
    var self = new ListItemWidget(parentList),
        displayName = 'Image',
        imageFile = '',
        altText = 'Image',
        icon = '';

    self.load = function (loadData) {
        imageFile = loadData.imageFile != null ? loadData.imageFile : imageFile;
        altText = loadData.altText != null ? loadData.altText : altText;
        icon = loadData.icon != null ? loadData.icon : icon;

        $(self.getSelector() + ' > div > img').attr('alt', altText);
    };

    self.html.push(
        '<h3 class="label label-default">' + displayName + '</h3>' +
        '<div>' +
            '<img src="#" alt="' + altText + '">' +
        '</div>' +
        self.menuHtml);

    self.getData = function () {
        var result = {
            "type": "image",
            "imageFile": imageFile,
            "altText": altText,
            "icon": icon
        };

        return result;
    };

    self.insert = function (selector) {
        self.baseInsert(selector);

        // Capture settings click.
        $(self.getSelector() + ' > .btn-group .settings-li-btn').click(function (e) {
            openFormModal(
                displayName + ' Settings',
                [
                    {
                        "id": "imageFile",
                        "type": "text",
                        "name": "Image",
                        "value": imageFile,
                        "placeholder": "screenshot.png or www.somewebsite.com/someimage.jpg",
                        "tooltip": ['The link/location for this image. It can be a URL to an image on another site, or just an image file name.']
                    },
                    {
                        "id": "altText",
                        "type": "text",
                        "name": "Aternate Text",
                        "value": altText,
                        "placeholder": "Screenshot",
                        "tooltip": ['The alternate text for this image in case it cannot be found or displayed.']
                    },
                    {
                        "id": "icon",
                        "type": "icon-selector",
                        "name": "Icon",
                        "value": icon,
                        "placeholder": "",
                        "tooltip": ['The icon that will be shown next to this item.']
                    }
                ],
                'Images will not appear within the editor.',
                function (results) {
                    imageFile = results.imageFile;
                    altText = results.altText;
                    icon = results.icon;

                    $(self.getSelector() + ' > div > img').attr('alt', altText);
                });

            e.preventDefault();
        });
    };

    return self;
};

var DownloadItemWidget = function (parentList, loadData) {
    var self = new ListItemWidget(parentList),
        displayName = 'Download',
        file = '',
        description = 'Download',
        icon = '';

    self.load = function (loadData) {
        file = loadData.file != null ? loadData.file : file;
        description = loadData.description != null ? loadData.description : description;
        icon = loadData.icon != null ? loadData.icon : icon;

        $(self.getSelector() + ' > div > a').text(description);
    };

    self.html.push(
        '<h3 class="label label-default">' + displayName + '</h3>' +
        '<div>' +
            '<a href="#" class="display-only-link">' + description + '</a>' +
        '</div>' +
        self.menuHtml);

    self.getData = function () {
        var result = {
            "type": "download",
            "file": file,
            "description": description,
            "icon": icon
        };

        return result;
    };

    self.insert = function (selector) {
        self.baseInsert(selector);

        // Capture settings click.
        $(self.getSelector() + ' > .btn-group .settings-li-btn').click(function (e) {
            openFormModal(
                displayName + ' Settings',
                [
                    {
                        "id": "file",
                        "type": "text",
                        "name": "File",
                        "value": file,
                        "placeholder": "somefile.zip",
                        "tooltip": ['The link/location for this file. It can be a URL to a file on another site, or a file name.']
                    },
                    {
                        "id": "description",
                        "type": "text",
                        "name": "Description",
                        "value": description,
                        "placeholder": "Some File Download",
                        "tooltip": ['The text to display to the user for this download link.']
                    },
                    {
                        "id": "icon",
                        "type": "icon-selector",
                        "name": "Icon",
                        "value": icon,
                        "placeholder": "",
                        "tooltip": ['The icon that will be shown next to this item.']
                    }
                ],
                'Download links will not function within the editor.',
                function (results) {
                    file = results.file;
                    description = results.description;
                    icon = results.icon;

                    $(self.getSelector() + ' > div > a').text(description);
                });

            e.preventDefault();
        });

        // Capture download link click.
        $(self.getSelector() + ' a.display-only-link').click(function (e) {
            e.preventDefault();
        });
    };

    return self;
};