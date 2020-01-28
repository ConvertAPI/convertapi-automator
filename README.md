# PROJECT IS UNDER DEVELOPMENT, DON'T USE!

# ConvertAPI Automator

## Automate file conversion on your desktop or server

The ConvertAPI Automator is converting various file formats.
Using is simple as copying file to input directory and get result from output directory.
Supports creating PDF and Images from various sources like Word, Excel, Powerpoint, images, web pages or raw HTML codes.
Merge, Encrypt, Split, Repair and Decrypt PDF files.
And many others files manipulations.
In less than a minute you can setup and start converting files.

The ConvertAPI Automator is using online Convert API service that is processing all the conversions.
You can get your free secret at https://www.convertapi.com/a

## Installation

Download compressed executable

* Linux: [convertapi-automator_lin.zip](http://github)
* Linux ARM64: [convertapi-automator_lin_arm.zip](http://github)
* Darwin (MacOS): [convertapi-automator_mac.zip](http://github)
* Windows: [convertapi-automator_win.zip](http://github)

(this utility also can be built from source code for many other CPU and OS)

Unzip executable 

```shell
unzip convertapi-automator_*.zip
```

And you are done.
Optionally you can move executable file to more appropriate place and make utility accessible for all local users. On Linux would be:   

```shell
sudo mv convertapi-automator /usr/local/bin
```

## Usage

### Before you start

In order to use this utility you must create your free trial account on https://www.convertapi.com site.  
After sign up process you will get your secret at https://www.convertapi.com/a .
Secret must be supplied as command line argument.

### Simple conversion

Before we go in to details, short usage example how to convert DOCX file to PDF.
Prepare input directory before conversion:

- Create input directory where you will copy files for conversion (e.g. `/path/to/convertdir`).
- Copy `docx` file to input directory.
- Create subfolder `pdf` inside input directory.

**IMPORTANT READ CAREFULLY!!!** All files that are located inside input directory will be **DELETED** during conversion.
Make sure that input directory has no other files but a **copy** of your original document.

```shell
convertapi-automator --secret=<YOUR_SECRET_HERE> --dir=/path/to/convertdir 
```

After program is finished you will find your `pdf` file inside `/path/to/convertdir/pdf`


### Command line arguments 

#### --secret
Your convertapi.com secret. Can be obtained from https://www.convertapi.com/a for free.

_Example:_

```shell
--secret=1adr4h8n1oyycvpw
```
&nbsp; 

#### --dir
Input directory with output directories structure inside.
Parameter can be set multiple times to have multiple input directories.

**IMPORTANT READ CAREFULLY!!!** All files that are located inside input directory will be **DELETED** during conversion.

_Example:_

```shell
--dir=/path/to/inputdir --dir=/outher/inputdir
```
&nbsp; 

#### --watch
Run convertapi-automator in input directories watching mode.
All files that are placed inside input directories will be converted and **deleted**.

If convertapi-automator is used as integrated part of other software, STDOUT can be red to get converted file full path.

_Example:_ 

```shell
--watch
```
&nbsp; 


### Examples

#### DOCX to PDF and JPG
`docx` files copied to `/my/conversions` will be converted to `pdf` and `jpg` formats.
All files that are located inside input directory will be **DELETED** during conversion.

Directory structure:

```text
/my/conversions
    ├ pdf
    └ jpg
```
Command:

```shell
convertapi-automator --secret=<YOUR_SECRET_HERE> --dir=/my/conversions 
```


#### PPT to PNG and TIFF in "watcher" mode
`ppt` files copied to `/my/conversions` will be converted to `png` and `tiff` formats.
All files that are located inside input directory will be **DELETED** during conversion.

Directory structure:

```text
/my/conversions
    ├ png
    └ tiff
```
Command:

```shell
convertapi-automator --secret=<YOUR_SECRET_HERE> --dir=/my/conversions --watch 
```

#### Multiple input directory example

Multiple input directories are useful for having many different conversion scenarios.
convertapi-automator can run on server watching multiple input directories assigned (shared) to separate users.
This way you only need one running instance to automate all your organisation.
All files that are located inside input directories will be **DELETED** during conversion.

Directory structure:

```text
/user1/imgconv
    ├ png
    └ tiff
/user1/splitpdf
    └ split
/user2/topdf
    └ pdf
/user3/totext
    └ txt
```
Command:

```shell
convertapi-automator --secret=<YOUR_SECRET_HERE> --dir=/user1/imgconv --dir=/user1/splitpdf --dir=/user2/topdf --dir=/user3/totext --watch 
```


### Issues &amp; Comments
Please leave all comments, bugs, requests, and issues on the Issues page. We'll respond to your request ASAP!

### License
The ConvertAPI Automator is licensed under the [MIT](http://www.opensource.org/licenses/mit-license.php "Read more about the MIT license form") license.
Refer to the [LICENSE](https://github.com/ConvertAPI/convertapi-automator/blob/master/LICENSE) file for more information.