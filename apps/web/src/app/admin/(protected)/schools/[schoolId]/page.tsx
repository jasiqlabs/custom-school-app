import SchoolUi from './ui';export default async function Page({params}:{params:Promise<{schoolId:string}>}){return <SchoolUi schoolId={(await params).schoolId}/>}
