import AcademicsUi from './ui';export default async function Page({params}:{params:Promise<{schoolId:string}>}){return <AcademicsUi schoolId={(await params).schoolId}/>}
