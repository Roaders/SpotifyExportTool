/**
 * Created by Giles on 22/01/2016.
 */

module Pricklythistle.Spotify.Service {

    import IHttpPromiseCallbackArg = angular.IHttpPromiseCallbackArg;

    export interface ITrackResult {
        originalId: string;
        details: ITrackDetails;
    }

    export interface ITrackDetails {
        name : string;
        id: string;
    }

    export interface ITrackError{
        id: string;
        error: IHttpPromiseCallbackArg<any>;
    }

    interface INumberOfErrors{
        errorCount: number;
        error?:  IHttpPromiseCallbackArg<any>;
    }

    export class SpotifyService {

        constructor( private $http: ng.IHttpService) {
        }

        lookupTrack( trackId: string ) : Rx.Observable<ITrackResult> {
            //console.log( `Loading track: ${trackId}` );

            return this.getObservable( trackId )
                .retryWhen( (errors) => {
                    return errors.scan<INumberOfErrors>( ( accumulatedErrors, error ) => this.countToThreeErrors( accumulatedErrors, error ), {errorCount: 0} )
                        .flatMap( ( accumulatedErrors ) => this.delayRetry( accumulatedErrors ) );
                } )
                .catch( ( error ) => {
                    return Rx.Observable.throw( { id: trackId, error: error } )
                } )
                .pluck<ITrackDetails>( "data" )
                .map<ITrackResult>( ( trackDetails ) => {return <ITrackResult>{ originalId: trackId, details: trackDetails }} );
        }

        private delayRetry( accumulatedErrors: INumberOfErrors ): Rx.Observable<any> {
            let delay: number = accumulatedErrors.error.status == 429 ? accumulatedErrors.errorCount * 2000 : 50;
            console.log( `Error received with status ${accumulatedErrors.error.statusText} retrying in ${delay}ms `);
            return Rx.Observable.just(true).delay( delay );
        }

        private countToThreeErrors( accumulatedErrors: INumberOfErrors, error: IHttpPromiseCallbackArg<any> ): INumberOfErrors {
            let errorCount: number = accumulatedErrors.errorCount;

            if( error.status == 429 ) {
                if(errorCount > 6) {
                    console.log( `Too many errors received for call (${errorCount}). Not trying again.` );
                    throw( error );
                }
            }
            if( errorCount > 3 )
            {
                console.log( `Too many errors received for call (${errorCount}). Not trying again.` );
                throw( error );
            }

            return {errorCount: errorCount+ 1, error: error };
        }

        private getObservable( trackId: string ): Rx.Observable<IHttpPromiseCallbackArg<ITrackDetails>> {

            return Rx.Observable.just(trackId)
                .flatMap( () => {
                    //console.log( `creating observable for track ${trackId})` );
                    return Rx.Observable.fromPromise<IHttpPromiseCallbackArg<ITrackDetails>>(
                        this.$http.get(`https://api.spotify.com/v1/tracks/${trackId}`)
                    );
                } );
        }
    }
}