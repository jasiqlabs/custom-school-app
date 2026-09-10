import OperatorsUi from './ui';export default async function Page({params}:{params:Promise<{schoolId:string}>}){return <OperatorsUi schoolId={(await params).schoolId}/>}
