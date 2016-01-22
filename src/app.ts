/**
 * Created by Giles on 22/01/2016.
 */

///<reference path="Pricklythistle.Spotify/controllers/spotifyExportController.ts" />
///<reference path="Pricklythistle.Spotify/services/spotifyService.ts" />

var module: ng.IModule = angular.module( "spotifyExportApp", [] );

module.controller( "spotifyExportController", Pricklythistle.Spotify.Controllers.SpotifyExportController );

module.service( "spotifyService", Pricklythistle.Spotify.Service.SpotifyService );

module.run( ["$rootScope", ( $rootScope ) => {
    new Rx.ScopeScheduler( $rootScope );
}]);