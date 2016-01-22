/**
 * Created by Giles on 22/01/2016.
 */

module Pricklythistle.Spotify.Controllers {

    import SpotifyService = Pricklythistle.Spotify.Service.SpotifyService;
    import ITrackDetails = Pricklythistle.Spotify.Service.ITrackDetails;
    import ITrackError = Pricklythistle.Spotify.Service.ITrackError;

    interface ITrackIdentifier {
        uri: string;
        id: string;
    }

    export class SpotifyExportController {

        //  Statics

        static uriRegExp : RegExp = new RegExp( "https://open.spotify.com/track/([0-9\\w]+)", "g" );

        //  Constructor

        constructor(
            private spotifyService: SpotifyService,
            private $rootScope: ng.IScope
        ) {

        }

        //  Private Variables

        private _allTracks: ITrackIdentifier[];
        private _results: ITrackDetails[];
        private _errors: {[id: string]: any};

        //  Properties

        private _exportList: string;

        public get exportList(): string {
            return this._exportList;
        }

        private _importList: string;

        public get importList(): string {
            return this._importList;
        }

        public set importList( value: string ) {
            this._importList = value;

            this.loadTracks( value );
        }

        get importCount(): string {
            return this._allTracks ? this._allTracks.length.toString() : "";
        }

        get resultCount(): string {
            return this._results ? this._results.length.toString() : "";
        }

        //  Private Functions

        private loadTracks( trackList: string ): void {
            this._allTracks = this.parseTrackIds( trackList );
            this._exportList = "";
            this._results = [];
            this._errors = {};

            console.time( "Load Track Details" );

            Rx.Observable.fromArray<ITrackIdentifier>( this._allTracks )
                .pluck<string>( "id" )
                .distinct()
                .flatMap( ( trackId ) => this.spotifyService.lookupTrack( trackId ) )
                .subscribe(
                    ( result ) => this.handleTrackLookupResult( result ),
                    ( error ) => this.handleError( error ),
                    () => this.handleComplete()
                );
        }

        private updateExportList(): void {
            var exportString: string = "";

            this._allTracks.forEach( ( trackIdentifier ) => {
                let matchingDetails: ITrackDetails[] = this._results.filter( ( details ) => { return details.id === trackIdentifier.id } );

                if( matchingDetails.length > 0 ) {
                    exportString += `${matchingDetails[0].name}\n`;
                } else if( this._errors[ trackIdentifier.id ] ) {
                    let error: ITrackError = this._errors[ trackIdentifier.id ];
                    let errorString: string = this._errors[ trackIdentifier.id ].toString();

                    exportString += `Error: ${this._errors[ trackIdentifier.id ].toString()}\n`;
                }
            } );

            this._exportList = exportString;
        }

        private handleTrackLookupResult( track: ITrackDetails ): void{
            console.log( `Track loaded: ${track.name}` );

            this._results.push( track );

            this.updateExportList();
        }

        private handleError( error: ITrackError ): Rx.Observable<ITrackDetails> {
            console.log( `Error ${error.toString()}` );

            this._errors[ error.id ] = error.error;

            this.updateExportList();

            return Rx.Observable.empty<ITrackDetails>();
        }

        private handleComplete(): void {

            console.log(`${this._allTracks.length} loaded`);
            console.timeEnd( "Load Track Details" );
        }

        private parseTrackIds( trackList: string ): ITrackIdentifier[] {

            const results: ITrackIdentifier[] = [];

            var currentTrack: RegExpExecArray = SpotifyExportController.uriRegExp.exec( trackList );

            while( currentTrack ) {
                results.push( { uri: currentTrack[0], id: currentTrack[1] } );

                currentTrack = SpotifyExportController.uriRegExp.exec( trackList );
            }

            return results;
        }
    }

}