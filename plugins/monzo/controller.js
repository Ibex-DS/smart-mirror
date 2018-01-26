const app = require('express')();

function Monzo($scope, $http, $q, $interval) {
    var configName = ('./config.json');

    function expressServer() {
        app.get('', (req, res, next) => {
            if(req.query.code) {
                codeToToken(req.query.code).then((token) => {
                    config.monzo.token = token.data.access_token;
                    config.monzo.refresh_token = token.data.refresh_token;
                    updateConfig();
                });
            }
            res.sendStatus(200);
        });
        app.listen(11111, () => {
            console.log("Monzo 0Auth2 listener on port 11111.");
        });
    }

    function codeToToken(token) {
        var q = $q.defer();

        const req = {
            method: "POST",
            url: `https://api.monzo.com/oauth2/token`,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            transformRequest: function(obj) {
                var str = [];
                for(var p in obj)
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: {
                grant_type: 'authorization_code',
                client_id: config.monzo.client_id,
                client_secret: config.monzo.client_secret,
                redirect_uri: "http://localhost:11111",
                code: token
            }
        }

        $http(req).then((data) => {
            return q.resolve(data);
        }).catch((e) => {
            console.error(e);
        });

        return q.promise;
    }

    function updateConfig() {
        var fs = require("fs");

        fs.writeFile(configName, JSON.stringify(config, null, 4), (err) => {
            if (err) {
                console.error(err);
            }
        });

    }

    function refreshToken() {
        let q = $q.defer;
        const req = {
            method: "POST",
            url: `https://api.monzo.com/oauth2/token`,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            transformRequest: function(obj) {
                var str = [];
                for(var p in obj)
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                return str.join("&");
            },
            data: {
                grant_type: 'refresh_token',
                client_id: config.monzo.client_id,
                client_secret: config.monzo.client_secret,
                refresh_token: config.monzo.refresh_token
            }
        }

        $http(req).then((token) => {
            config.monzo.token = token.data.access_token;
            config.monzo.refresh_token = token.data.refresh_token;
            updateConfig();
            q.resolve();
        });

        return q.promise;
    }

    function updateAccounts() {
        $scope.monzoAccounts = [];
        var q = $q.defer();

        const req = {
            method: 'GET',
            url: 'https://api.monzo.com/accounts',
            headers: {
                'Authorization': `Bearer ${config.monzo.token}`
            }
        }

        $http(req).then((res) => {
            $scope.monzoAccounts = res.data.accounts;
            return q.resolve();
        }).catch((err) => {
            $scope.error = err.data.message;
            if (config.monzo.refresh_token) {
                refreshToken().then(() => {});
            }
            return q.resolve();
        });

        return q.promise;
    }

    function updateBalances() {
        $scope.monzoBalances = [];
        $scope.monzoAccounts.forEach(account => {
            const req = {
                method: 'GET',
                url: `https://api.monzo.com/balance?account_id=${account.id}`,
                headers: {
                    'Authorization': `Bearer ${config.monzo.token}`
                }
            }
    
            $http(req).then((res) => {
                $scope.monzoBalances[account.id] = res.data;
            }).catch((err) => {
                $scope.error = err.data.message;
            });
        });
    }

    function updatePots() {
        $scope.monzoPots = [];
        const req = {
            method: 'GET',
            url: `https://api.monzo.com/pots/listV1`,
            headers: {
                'Authorization': `Bearer ${config.monzo.token}`
            }
        }

        $http(req).then((res) => {
            $scope.monzoPots = res.data.pots;
        }).catch((err) => {
            $scope.error = err.data.message;
        });
    }

    function updateInterface() {
        if ($scope.error) {
            console.log();
            if (!config.monzo.refresh_token) {
                expressServer();
            } else {
                refreshToken();
            }
            return false;
        }
        updateAccounts().then(() => {
            updateBalances();
            if (config.monzo.potsEnabled) {
                updatePots();
            }
        }).catch(() => {
            updateInterface();
        });
    }

    updateInterface();
    $interval(updateInterface, config.monzo.refreshTime * 1000);

}

angular.module('SmartMirror')
    .controller('Monzo', Monzo);