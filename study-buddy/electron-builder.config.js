module.exports = {
  appId: "com.studybuddy.desktop",
  productName: "Study Buddy",
  directories: { output: "release" },
  files: ["main/**/*", "dist/**/*", "assets/**/*", "package.json"],
  asarUnpack: ["**/*.node", "**/prebuilds/**"],
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    artifactName: "Study-Buddy-${version}-Setup.${ext}",
  },
  mac: {
    target: ["zip"],
    category: "public.app-category.education",
    identity: null,
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
  },
};
