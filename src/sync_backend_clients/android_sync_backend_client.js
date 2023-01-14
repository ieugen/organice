import { fromJS } from 'immutable';
import OrganiceSync from '../organice_android_sync';
import { isEmpty } from 'lodash';
import { orgFileExtensions } from '../lib/org_utils';

export const pickDirectory = async () => {
  // 2. Pick files
  const result = await OrganiceSync.pickDirectory();
  return result;
};

/**
 * Gets a directory listing ready to be rendered by organice.
 *  - Filters files from `listing` down to org files.
 *  - Sorts folders atop of files.
 *  - Sorts both folders and files alphabetically.
 * @param {Array} listing
 */
export const filterAndSortDirectoryListing = (listing) => {
  return listing
    .filter((file) => {
      // alert("File " + JSON.stringify(file))
      // Show all folders
      if (file.isDirectory) return true;
      // And only file with the 'org' extension
      return file.name.match(orgFileExtensions);
    })
    .sort((a, b) => {
      // alert("a:" + JSON.stringify(a) +" :: b:" + JSON.stringify(b))
      // Folders before files
      if (a.isDirectory && b.isFile) {
        return -1;
      } else {
        return a.name > b.name ? 1 : -1;
      }
    });
};

// Uri can look like:
// content://com.android.externalstorage.documents/tree/1413-3A04%3Aorg
export default (uri, rootPath) => {
  // alert("We have uri " + uri)
  const isSignedIn = () => new Promise((resolve) => resolve(true));

  const transformDirectoryListing = (listing) => {
    const sortedListing = filterAndSortDirectoryListing(listing);
    return fromJS(sortedListing);
  };

  const getDirectoryListing = (path) =>
    new Promise((resolve, reject) => {
      // alert("List directory " + uri + " -> " + path)
      OrganiceSync.listFiles({ uri, path })
        .then((response) => {
          const { files } = response;
          const listing = transformDirectoryListing(files);
          return resolve({ listing });
        })
        .catch((error) => {
          alert('Error getDirectoryListing ' + JSON.stringify(error));
          reject();
        });
    });

  const getMoreDirectoryListing = (_additionalSyncBackendState) => {
    // TODO
    return new Promise((resolve, reject) => resolve());
  };

  const uploadFile = (path, contents) =>
    new Promise((resolve, reject) => {
      return OrganiceSync.putFileContents({ uri, path, contents })
        .then(resolve())
        .catch((error) => {
          alert('Error uploadFile ' + JSON.stringify(error));
          reject();
        });
    });

  const updateFile = uploadFile;

  const createFile = (path, content) => {
    new Promise((resolve, reject) => {
      if (!path.startsWith(rootPath)) {
        // Fix paths for files in root directory
        path = rootPath + path;
      }
      return OrganiceSync.createFile({ uri, path, content, rootPath })
        .then(resolve())
        .catch((error) => {
          alert('Error createFile ' + JSON.stringify(error));
          reject();
        });
    });
  };

  const getFileContentsAndMetadata = (path) =>
    new Promise((resolve, reject) => {
      return OrganiceSync.getFileContentsAndMetadata({ uri, path })
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          alert('Error getFileContentsAndMetadata ' + JSON.stringify(error));
          reject();
        });
    });

  const getFileContents = (path) => {
    if (isEmpty(path)) return Promise.reject('No path given');
    return new Promise((resolve, reject) =>
      getFileContentsAndMetadata(path)
        .then(({ contents }) => resolve(contents))
        .catch(reject)
    );
  };

  const deleteFile = (path) =>
    new Promise((resolve, reject) =>
      OrganiceSync.deleteFile({ uri, path })
        .then(resolve)
        .catch((error) => {
          alert('deleteFile failed ' + path + JSON.stringify(error));
          reject();
        })
    );

  return {
    type: 'AndroidStorage',
    isSignedIn,
    getDirectoryListing,
    getMoreDirectoryListing,
    updateFile,
    createFile,
    getFileContentsAndMetadata,
    getFileContents,
    deleteFile,
  };
};