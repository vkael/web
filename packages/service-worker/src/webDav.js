class WebDavHelper {
	constructor() {
		this.webDavPath = "https://host.docker.internal:9200/remote.php/dav";
	}
	async moveFile(sourceSpaceId, sourcePath, targetSpaceId, targetPath, token){
		return fetch(`${this.webDavPath}/spaces/${sourceSpaceId}/${sourcePath}`, {
		method: 'COPY',
		mode: 'cors',
		cache: 'no-cache',
		credentials: 'same-origin',
		headers: {
				authorization: `Bearer ${token}`,
				overwrite: 'F',
				destination: `${this.webDavPath}/spaces/${targetSpaceId}/${targetPath}`,
				'OCS-APIREQUEST': 'true'
		},
		redirect: 'follow',
		referrerPolicy: 'no-referrer'
		});
	}
}

export const WebDavClient = new WebDavHelper()