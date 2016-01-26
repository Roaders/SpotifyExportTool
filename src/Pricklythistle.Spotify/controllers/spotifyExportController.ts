/**
 * Created by Giles on 22/01/2016.
 */

///<reference path="../../../typings/angularjs/angular.d.ts" />

module Pricklythistle.Spotify.Controllers {

    import SpotifyService = Pricklythistle.Spotify.Service.SpotifyService;
    import ITrackDetails = Pricklythistle.Spotify.Service.ITrackDetails;
    import ITrackError = Pricklythistle.Spotify.Service.ITrackError;
    import ITrackResult = Pricklythistle.Spotify.Service.ITrackResult;

    interface ITrackIdentifier {
        uri: string;
        id: string;
    }

    export class SpotifyExportController {

        //  Statics

        static uriRegExp : RegExp = new RegExp( "https://open.spotify.com/track/([0-9\\w]+)", "g" );

        //  Constructor

        //TODO: Remove reliance on rootscope
        //TODO: add spinner to index.html
        constructor(
            private spotifyService: SpotifyService,
            private $rootScope: ng.IScope
        ) {

        }

        //  Private Variables

        private _allTracks: ITrackIdentifier[];

        private _resultLookup: {[id:string]:ITrackDetails};
        private _errorLookup: {[id:string]:ITrackError};

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

        private _resultCount: string = "";

        get resultCount(): string {
            return this._resultCount;
        }

        private _errorCount: string = "";

        get errorCount(): string {
            return this._errorCount;
        }

        //  Private Functions

        private loadTracks( trackList: string ): void {
            this._exportList = "";
            this._resultLookup = {};
            this._errorLookup = {};

            this._errorCount = "";
            this._resultCount = "";

            this._allTracks = this.parseTrackIds( trackList );

            console.log( `Starting load of ${this._allTracks.length}` );
            console.time( "Load Track Details" );

            Rx.Observable.fromArray<ITrackIdentifier>( this._allTracks )
                .pluck<string>( "id" )
                .distinct()
                .bufferWithCount( 45 )
                .map( trackIds => {
                    return this.spotifyService.lookupTracks(trackIds).
                        catch( error => this.handleError(error) )
                    }
                )
                .merge(6 )
                .safeApply(
                    this.$rootScope,
                    ( result ) => this.handleTrackLookupResult( result ),
                    ( error ) => this.handleError( error ),
                    () => this.handleComplete())
                .subscribe();
        }

        private updateExportList(): void {
            console.log( "updateExportList" );
            var exportString: string = "";
            var currentResultCount: number = 0;
            var currentErrorCount: number = 0;

            this._allTracks.forEach( ( trackIdentifier ) => {

                if( this._resultLookup[trackIdentifier.id] ) {
                    currentResultCount++;
                    exportString += `${this._resultLookup[trackIdentifier.id].name}\n`;
                } else {
                    if( this._errorLookup[trackIdentifier.id] ) {
                        currentErrorCount++;
                        let error: ITrackError = this._errorLookup[trackIdentifier.id];
                        exportString += `Error for ${trackIdentifier.id}: ${error.error.statusText}\n`;
                    }
                }
            } );

            this._resultCount = currentResultCount.toString();
            this._errorCount = currentErrorCount > 0 ? currentErrorCount.toString() : "";

            this._exportList = exportString;
        }

        private handleTrackLookupResult( trackResults: ITrackResult ): void{

            for(var index: number = 0; index < trackResults.originalIds.length; index ++){
                var originalId: string = trackResults.originalIds[index];
                var trackDetails: ITrackDetails = trackResults.details[index];
                console.log( `Track loaded: ${trackDetails.name} (${trackDetails.id})` );

                this._resultLookup[originalId] = trackDetails;
            }

            this.updateExportList();
        }

        private handleError( error: ITrackError ): Rx.Observable<ITrackResult> {

            error.ids.forEach( (trackId) => {
                console.log( `Error ${error.error.statusText} in controller` );

                this._errorLookup[trackId] = error;
            } );

            this.updateExportList();

            return Rx.Observable.empty<ITrackResult>();
        }

        private handleComplete(): void {

            this.updateExportList();

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