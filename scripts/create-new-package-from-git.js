// git clone https://github.com/alexjoverm/typescript-library-starter.git
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const workDir = process.cwd();
const defaultGitOrigin = 'https://github.com/alexjoverm/typescript-library-starter.git';
// eslint-disable-next-line no-unused-vars
const [_, __, subPackName = 'test', branch = 'master'] = process.argv;


const subModuleName = '.temp/sub-package-template';
const sourcePath = path.join(workDir, subModuleName);

const spawnOption = {
  stdio: 'inherit',
  cwd: workDir,
};

const targetDir = path.join(workDir, `packages/${subPackName}`);

function rmSubModules() {
  spawnSync('rm', ['-rf', '.gitmodules'], spawnOption);
  spawnSync('git', ['rm', '--cached', subModuleName], spawnOption);
  spawnSync('rm', ['-rf', '.git/modules'], spawnOption);
  spawnSync('rm', ['-rf', sourcePath]);
}

function gitCloneSubPackageTemplate(origin = defaultGitOrigin) {
  if(!subPackName) {
    console.log('请输入子包名');
    return;
  }
  if(!origin) {
    return;
  }
  rmSubModules();
  spawnSync('git', ['restore', '.gitmodules'], spawnOption);
  spawnSync(
    'git',
    [
      'submodule',
      'add',
      '-b',
      branch,
      origin,
      subModuleName,
      '--depth=1',
    ],
    spawnOption,
  );
  copyTemplate();
}

function copyTemplate() {
  spawnSync('cp', ['-r', path.join(sourcePath), targetDir]);
  rmSubModules();
  rewriteFiles([{
    name: 'README.md',
    content: ''
  }]);
  console.log('\n开始安装');
  spawnSync('lerna', ['bootstrap'], {
    stdio: 'inherit'
  });
  console.log('\n安装结束');
}

function rewriteFiles(filenams = []) {
  filenams.forEach(filename => {
    const filePath = path.join(targetDir, filename.name);
    if(fs.existsSync(filePath)) {
      fs.writeFile(filePath, filename.content, (err) => {
        if(err) {
          console.log('错误了', err);
        }
      })
    }
  })
}
gitCloneSubPackageTemplate();