function Monzo($scope, $http, $q, $interval) {

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
            q.resolve();
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
        });
    }

    function updateInterface() {
        updateAccounts().then(() => {
            updateBalances();
            if (config.monzo.potsEnabled) {
                updatePots();
            }
        });
    }

    updateInterface();
    $interval(updateInterface, config.monzo.refreshTime * 1000);

}

angular.module('SmartMirror')
    .controller('Monzo', Monzo);