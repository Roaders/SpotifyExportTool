/**
 * Created by Giles on 22/01/2016.
 */

module Pricklythistle.Spotify.Service {

    import IHttpPromiseCallbackArg = angular.IHttpPromiseCallbackArg;

    export interface ITrackResult {
        originalIds: string[];
        details: ITrackDetails[];
    }

    interface ITrackListResult{
        tracks: ITrackDetails[];
    }

    export interface ITrackDetails {
        name : string;
        id: string;
    }

    export interface ITrackError{
        ids: string[];
        error: IHttpPromiseCallbackArg<any>;
    }

    interface INumberOfErrors{
        errorCount: number;
        error?:  IHttpPromiseCallbackArg<any>;
    }

    export class SpotifyService {

        constructor( private $http: ng.IHttpService) {
        }

        lookupTracks( trackIds: string[] ) : Rx.Observable<ITrackResult> {
            //console.log( `Loading track: ${trackId}` );

            return this.getObservable( trackIds )
                .retryWhen( (errors) => {
                    return errors.scan<INumberOfErrors>( ( accumulatedErrors, error ) => this.countToThreeErrors( accumulatedErrors, error ), {errorCount: 0} )
                        .flatMap( ( accumulatedErrors ) => this.delayRetry( accumulatedErrors ) );
                } )
                .catch( ( error ) => {
                    return Rx.Observable.throw( { ids: trackIds, error: error } )
                } )
                .map<ITrackResult>( ( trackListResult ) => {
                    return <ITrackResult>{ originalIds: trackIds, details: trackListResult.data.tracks }
                });
        }

        private delayRetry( accumulatedErrors: INumberOfErrors ): Rx.Observable<any> {
            let delay: number = accumulatedErrors.error.status == 429 ? 2000 : 50;
            console.log( `Error received with status ${accumulatedErrors.error.statusText} retrying in ${delay}ms `);
            return Rx.Observable.just(true).delay( delay );
        }

        private countToThreeErrors( accumulatedErrors: INumberOfErrors, error: IHttpPromiseCallbackArg<any> ): INumberOfErrors {
            let errorCount: number = accumulatedErrors.errorCount;

            if( errorCount > 3 )
            {
                console.log( `Too many errors received for call (${errorCount}). Not trying again.` );
                throw( error );
            }

            return {errorCount: errorCount+ 1, error: error };
        }

        private getObservable( trackIds: string[] ): Rx.Observable<IHttpPromiseCallbackArg<ITrackListResult>> {

            return Rx.Observable.just(trackIds)
                .flatMap( () => {
                    //console.log( `creating observable for track ${trackId})` );
                    return Rx.Observable.fromPromise<IHttpPromiseCallbackArg<ITrackListResult>>(
                        this.$http.get(`https://api.spotify.com/v1/tracks?ids=${trackIds.toString()}`)
                    );
                } );
        }
    }
}