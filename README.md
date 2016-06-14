# check-assignments
An education centered, web-based assignment delivery application focusing on consistency and simplicity.

## About
Check Assignments is a basic website that reads a data file (formatted as JSON) and generates an interactive assignment from the data. The data file is retrieved via an AJAX call at page load based on a URL parameter. As someone progresses through an assignment by checking off tasks, the progress is stored in local storage.

### Features
* Check-able tasks
* Progress display
* Light and dark theme
* Basic printing functionality (for those preferring to work through assignments using paper)
* No server-side code requirements
* Assignment tasks can be nested and can include images, raw text, downloads and more. 
* Persisted data (per device) using local storage of assignment progress and theme selection.
    
## Getting Started
To run the site, open index.html the `/src` folder. Note that because data files are retrieved via an AJAX call, the site must run through a host (if testing locally, you can run it through a localhost).

The index page requires the `d` URL parameter to specify which data file should be loaded. A sample data file is provided in `/src/data/demo/demo1.json` and can be loaded by specifying the `d` parameter as `/index.html?d=demo/demo1`.

The value of the `d` URL parameter is the path to the data file starting at the `/data` folder within the site. Any assignment data files should be placed in this folder or within subfolders of this folder. To load the data file `/data/foo/bar.json`, you would specify `/index.html?d=foo/bar` (the .json file extension excluded).


### Deployment
Since there are no server-side requirements, simply copy the contents of the `/src` folder and include your assignment data files within the `/src/data` folder. While not required, it is recommended that you minify the non-minified JavaScript and CSS files prior to deployment.

## Data File Format
The contents of the data files must be valid JSON and use the following format.

### Root
The data file root object must include an `id`, `name` and `description`. 
* `id` (required) is the key to persist the progress for the assignment. Should be unique across assignments.
* `name` (required) is the name shown to the user.
* `description` (required) is the description shown to the user.
* `notice` (optional) shows an emphasized message to the user.
* `tasks` (optional) contains the assignment tasks.
* `emphasizeRootTasks` (optional - defaults to `false`) specifies if the root level tasks should be emphasized.

Example:

```javascript
{
    "id": "02b5edb1",
    "name": "Demo One",
    "description": "For this assignment, you'll be adding an alert message to a simple JavaScript application.",
    "notice": "Ensure that you are using Google Chrome during this assignment.",
    "emphasizeRootTasks": false,
    "tasks": []
}
```

### Tasks
Task objects are specified within the `tasks` array within the root.
* `id` (required) is the key to persist the progress for the task. Must be unique within an assignment.
* `description` (required) is the description shown to the user.
* `checkable` (optional - defaults to `true`) specifies if the task should be check-able.
* `progressPoints` (optional - defaults to `1`) specifies the weight of the task within the progress for the assignment.
* `icon` (optional) is where the icon is specified. Icons use [Font Awesome](http://fontawesome.io/icons/) icons. Specify the [Font Awesome](http://fontawesome.io/icons/) icon name for the icon you wish to display.
* `items` (optional) is where items are specified. 
* `tasks` (optional) is where subtasks are specified.

Example:
```javascript
"tasks": [
    {
        "id": "1",
        "description": "Open the index.html file for editing in an IDE.",
        "progressPoints": 1,
        "checkable": true,
        "icon": "fa-pencil",
        "items": [],
        "tasks": []
    }
]
```

#### Items
Items are specified within the `items` array within the task. Items are used to include images, downloads and more to a task. 
* `type` (required) specifies the type of item. Supported item types are:
    *  `"download"` is how a download link is attached to a task. Supports `file` (required) and `description` (required) to be specified.
    *  `"image"` is how an image is attached to a task. Supports `imageFile` (required), `altText` (required) and `width` (optional).
    *  `"link"` is how a link is attached to a task. Supports `location` (required) and `description` (required).
    *  `"raw"` is how raw text is attached to a task. Supports `content` (required).
    *  `"text"` is how subtext is attached to a task. Supports `content` (required).
* `icon` (optional) is where the icon is specified. Icons use [Font Awesome](http://fontawesome.io/icons/) icons. Specify the [Font Awesome](http://fontawesome.io/icons/) icon name for the icon you wish to display.    

Example:
```javascript
"items": [
    {
        "type": "download",
        "file": "demo1-starter.zip",
        "description": "Starter files",
        "icon": "fa-download"
    },
    {
        "type": "image",
        "imageFile": "hello-world-alert.png",
        "altText": "Hello World"
    },
    {
        "type": "link",
        "location": "http://google.com",
        "description": "Google"
    },
    {
        "type": "raw",
        "content": "alert('Hello, World');"
    },
    {
        "type": "text",
        "content": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt"
    }
]
```
#### Tasks (subtasks)
Tasks can be nested within the `tasks` array as many times as desired. The same task object structure applies for nested tasks.

Example:
```javascript
"tasks": [
    {
        "id": "1",
        "description": "Modify the code to show a message to the user.",
        "tasks": [
        	{
                "id": "1-1",
                "description": "Open the index.html file for editing in an IDE.",
                "tasks": [
                    {
                        "id": "1-1-1",
                        "description": "Add comments to the code explaining what it does."
                    }
                ]
    		}
        ]
    }
]
```
## Contributing
Please make all pull requests against the development branch.

All pull requests are subject to approval by the repository owner(s), who have sole discretion over acceptance or denial.
