import TcUi from './ui';export default async function Page({params}:{params:Promise<{schoolId:string}>}){return <TcUi schoolId={(await params).schoolId}/>}
