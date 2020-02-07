# **Automate file format conversions** without installing software in to your office workstations

In every company employees that work with documents needs to convert documents to other formats.
**Conversion software** can be expensive and takes time to deploy and keep update on all of your office computers.
To make administrators life easier we built **open source** file **conversion automation tool**.

convertapi-automator is a **crossplatform** file conversion utility that converts files located in the input directory and converted files are placed in to the output directory.
This **file conversion application** also can be ran as **daemon** (on **Linux** or **Mac OS X**) or as **Windows service**.
When automator is running as daemon it is watching input directories for new files to appear and converts them.

## Let's automate file conversions on Windows network
While other platforms are gaining popularity Windows still stays most popular desktop OS used in business.
Assuming that your office is using Windows, let's make file format conversion really simple in all of your office workstations.

### **Download file converter**
convertapi-automator tool is just one executable file that don't require installation and can be placed anywhere you like.
In this tutorial we will use `C:\convertapi-automator` directory for storing executables and input directories.

Go to https://github.com/ConvertAPI/convertapi-automator and download compressed executable and extract it to `C:\convertapi-automator`.

Download [Windows service registration script](https://raw.githubusercontent.com/ConvertAPI/convertapi-automator/master/Cli/register-win-service.bat).
Save (Ctrl+S) this script as `register-win-service.bat` in to the same `C:\convertapi-automator` directory. 

### Register to convertapi.com
convertapi-automator is using convertapi.com API.
You need to [register](https://www.convertapi.com/a/su) to get your secret key and trial conversion time. 

### Prepare input and output directory structure
Inside `C:\convertapi-automator` directory create `share1` directory and share it to other office workstations with `read/write` permissions.
`C:\convertapi-automator\share1` will be used as input directory for files that will be converted.

Edit `register-win-service.bat`
![Image description](register-service.png)

Replace `<SECRET>` with your convertapi.com secret.
Make sure that `--dir=` correctly points to shared input directory.
Save file and run `register-win-service.bat` as administrator.
![Image description](register-service-run.png)

After executing bat file you should see running `convertapi-automator` service inside `Services` window.

### Test your setup 
Create subdirectory inside `C:\convertapi-automator\share1` named as required destination format e.g. `pdf`.
**Copy** `docx` or any other office document file inside `C:\convertapi-automator\share1` directory.
**IMPORTANT!!!** ALWAYS COPY NEVER MOVE files in to the input directory as they will be instantly **DELETED**.
 Open `C:\convertapi-automator\share1\pdf` directory and in few seconds (time depends on input file size) converted `pdf` file will appear.

### Convert from workstation
...

## Final thoughts
multi user

chaining

convertapi-automator is developed using most recent Microsoft .NET Core technology so it perfectly meets requirements of this tool.

that does not require any software on workstation side.
