export const getBuilds = async (target: string) =>
	await fetch(
		`${process.env.UNITY_API_BASE_URL}${process.env.UNITY_API_PATH}/orgs/${process.env.UNITY_ORG_ID}/projects/${process.env.UNITY_PROJECT_ID}/buildtargets/${target}/builds?per_page=25&page=1&showDeleted=false`,
		{
			method: 'GET',
			headers: {
				Authorization: process.env.UNITY_API_KEY as string,
				Accept: 'application/json'
			}
		}
	);

export const setEnvironmentVariables = async (version: string, target: string) =>
	await fetch(`${process.env.UNITY_API_BASE_URL}${process.env.UNITY_API_PATH}/orgs/${process.env.UNITY_ORG_ID}/projects/${process.env.UNITY_PROJECT_ID}/buildtargets/${target}/envvars`, {
		method: 'PUT',
		headers: {
			Authorization: process.env.UNITY_API_KEY as string,
			Accept: 'application/json',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			envvars: {
				PREPROCESS_VERSION: version
			}
		})
	});

export const submitBuild = async (target: string) =>
	await fetch(`${process.env.UNITY_API_BASE_URL}${process.env.UNITY_API_PATH}/orgs/${process.env.UNITY_ORG_ID}/projects/${process.env.UNITY_PROJECT_ID}/buildtargets/${target}/builds`, {
		method: 'POST',
		headers: {
			Authorization: process.env.UNITY_API_KEY as string,
			Accept: 'application/json'
		}
	});

export const getBuildTargets = async () =>
	await fetch(`${process.env.UNITY_API_BASE_URL}${process.env.UNITY_API_PATH}/orgs/${process.env.UNITY_ORG_ID}/projects/${process.env.UNITY_PROJECT_ID}/buildtargets`, {
		method: 'GET',
		headers: {
			Authorization: process.env.UNITY_API_KEY as string,
			Accept: 'application/json'
		}
	});
