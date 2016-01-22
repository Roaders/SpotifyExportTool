/**
 * Created by Giles on 22/01/2016.
 */

module Pricklythistle.Spotify.Service {

    import IHttpPromiseCallbackArg = angular.IHttpPromiseCallbackArg;

    export interface ITrackDetails {
        name : string;
        id: string;
    }

    export interface ITrackError{
        id: string;
        error: any;
    }

    export class SpotifyService {

        constructor( private $http: ng.IHttpService) {
        }

        lookupTrack( trackId: string ) : Rx.Observable<ITrackDetails> {
            //console.log( `Looking up track: ${trackId}` );

            return Rx.Observable.fromPromise<IHttpPromiseCallbackArg<ITrackDetails>>(this.$http.get( `https://api.spotify.com/v1/tracks/${trackId}` ))
                .retry(3)
                .catch( (error) => {
                    return Rx.Observable.throw<ITrackDetails>( <ITrackError>{ id: trackId, error: error } );
                } )
                .pluck<ITrackDetails>( "data" );
        }
    }
}