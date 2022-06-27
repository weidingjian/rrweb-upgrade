/**
 * This script runs automatically after your first npm-install.
 */
 const _prompt = require("prompt")
 const { mv, rm, which, exec } = require("shelljs")
 const replace = require("replace-in-file")
 const colors = require("colors")
 const path = require("path")
 const { readFileSync, writeFileSync } = require("fs")
 const { fork, spawnSync } = require("child_process");

 const packagesPath = path.join(process.cwd(), 'packages');
 const pkgTemp = path.join(process.cwd(), 'temp/package');
 const modifyFiles = [
   "LICENSE",
   "package.json",
   "rollup.config.ts",
   "test/library.test.ts",
   "tools/gh-pages-publish.ts"
 ]
 const renameFiles = [
   ["src/library.ts", "src/--libraryname--.ts"],
   ["test/library.test.ts", "test/--libraryname--.test.ts"]
 ]

 const _promptSchemaLibraryName = {
   properties: {
     library: {
       description: colors.cyan(
         "What do you want the library to be called? (use kebab-case)"
       ),
       pattern: /^[a-z]+(\-[a-z]+)*$/,
       type: "string",
       required: true,
       message:
         '"kebab-case" uses lowercase letters, and hyphens for any punctuation'
     }
   }
 }

 _prompt.start()
 _prompt.message = ""

 // Clear console
 process.stdout.write('\x1B[2J\x1B[0f');

 if (!which("git")) {
   console.log(colors.red("Sorry, this script requires git"))
  //  removeItems()
   process.exit(1)
 }

 // Say hi!
 console.log(
   colors.cyan("Hi! You're almost ready to make the next great TypeScript library.")
 )

 libraryNameCreate();

 /**
  * Asks the user for the name of the library if it has been cloned into the
  * default directory, or if they want a different name to the one suggested
  */
 function libraryNameCreate() {
   _prompt.get(_promptSchemaLibraryName, (err, res) => {
     if (err) {
       console.log(colors.red("Sorry, there was an error building the workspace :("))
      //  removeItems()
       process.exit(1)
       return
     }
     spawnSync('cp', ['-r', pkgTemp, path.join(packagesPath, res.library)]);
     setupLibrary(res.library)
   });
 }

 /**
  * Calls all of the functions needed to setup the library
  *
  * @param libraryName
  */
 function setupLibrary(libraryName) {
   console.log(
     colors.cyan(
       "\nThanks for the info. The last few changes are being made... hang tight!\n\n"
     )
   )

   // Get the Git username and email before the .git directory is removed
  //  let username = exec("git config user.name").stdout.trim() || 'weidingjian';
  //  let usermail = exec("git config user.email").stdout.trim() || '920806340@qq.com';
   let username = 'weidingjian';
   let usermail = '920806340@qq.com';
  //  removeItems()

   modifyContents(libraryName, username, usermail)

   renameItems(libraryName)

  //  finalize()

   console.log(colors.cyan("OK, you're all set. Happy coding!! ;)\n"))
 }

 /**
  * Updates the contents of the template files with the library name or user details
  *
  * @param libraryName
  * @param username
  * @param usermail
  */
 function modifyContents(libraryName, username, usermail) {
   console.log(colors.underline.white("Modified"))

   let files = modifyFiles.map(f => path.resolve(path.join(packagesPath, libraryName), f));
   try {
     const changes = replace.sync({
       files,
       from: [/--libraryname--/g, /--username--/g, /--usermail--/g],
       to: [libraryName, username, usermail]
     })
     console.log(colors.yellow(modifyFiles.join("\n")))
   } catch (error) {
     console.error("An error occurred modifying the file: ", error)
   }

   console.log("\n")
 }

 /**
  * Renames any template files to the new library name
  *
  * @param libraryName
  */
 function renameItems(libraryName) {
   console.log(colors.underline.white("Renamed"))

   renameFiles.forEach(function(files) {
     // Files[0] is the current filename
     // Files[1] is the new name
     let newFilename = files[1].replace(/--libraryname--/g, libraryName);
     const _base = path.join(packagesPath, libraryName);
     mv(
       path.resolve(_base, files[0]),
       path.resolve(_base, newFilename)
     )
     console.log(colors.cyan(files[0] + " => " + newFilename))
   })

   console.log("\n")
 }
