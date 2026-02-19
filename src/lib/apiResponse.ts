import { NextResponse } from "next/server";

export function successResponse(status = 200, message = "Operation Successfull", data = {}) {

    return NextResponse.json({
        Success: true,
        Message: message,
        Data: data
    }, {
        status
    })
}


export function errorResponse(status=400, message="Something went wrong", error="" ){
    return NextResponse.json({
        Success:false,
        Message:message,
        Error:error
    },{
        status
    })
}