// # New nsd Controllers
define(['underscore',
    'angular',
    'ngDialog',
    'ngGrid',
    'json-formatter',
    '../services/api_services',
    '../services/session_services'], function(_) {

    var nsdControllers = angular.module('nsdControllers', ['apiServices', 'ngDialog', 'ngGrid', 'jsonFormatter', 'sessionServices']);

    // New nsd form Controller
    nsdControllers.controller('newNsdFormController',
        ['$scope', '$location', '$validator', '$window', 'API', 'Session',
        function($scope, $location, $validator, $window, API, Session) {
                
        $scope.nsd = {
            name: '',
            project_id: Session.getCurrentSessionInfo().current_project_id
        };
        $scope.projects = [];
        
        // This method calls `projectRead` api call and fetches all
        // projects created by user.
        $scope.fetchProjects = function() {
            API.projectsRead()
                    .success(function(response) {
                        $scope.projects = response.results;
                    })
                    .error(function(error) {
                        console.log(error.details);
                        alert(error.details);
                    });
        };

        $scope.validateForm = function() {
            $validator.validate($scope, 'nsd').success(function() {
                if ($location.search().plan_id) {
                    $scope.nsd.plan_id = $location.search().plan_id;
                } 
                
                $scope.createNsd();
                
            });
        };
        
        // This method calls `createNsd` api call and creates a new
        // nsd file in the database. On success, the newly created object
        // is returned and we redirect user to nsd edit screen.
        // 
        
        $scope.createNsd = function() {
            API.nsdCreate($scope.nsd)
                    .success(function(response) {
                        $window.location.href = '#!/nsd/' + response._id;
            })
                    .error(function(error) {
                       console.log(error.details);
                       alert(error.details); 
            });
        };

        $scope.fetchProjects();
    }]);

    // ## nsd controller
    nsdControllers.controller('nsdController',
        ['$scope', '$routeParams', 'API', '$timeout', 'ngDialog', '$location', 'Session',
        function($scope, $routeParams, API, $timeout, ngDialog, $location, Session) {

        // ### Initializations
        
        $scope.nsd = {};
        $scope.temp = {
            load_finished: false
        };
        $scope.temp.environment = {};
        $scope.temp.environment.sensor_mapping = [];
        
        $scope.alerts = {
            save_success: false
        };

        // Loads an existing nsd from database.
        // As soon as the data is fetched, we fill
        // nsd editor's screens with the existing data (if any)
        $scope.loadNsd = function() {
            API.nsdRead($routeParams.id)
                    .success(function(response) {
                        $scope.nsd = response;
                        $scope.getProjectName($scope.nsd.project_id);
                        
                        if ($scope.nsd.plan_id) {
                            $scope.fetchSelectedPlan($scope.nsd.plan_id);
                        } else {
                            $scope.nsd.plan_id = Session.getCurrentSessionInfo().current_plan_id;
                        }
                        
                        $scope.initializeHil($scope.nsd);
                        $scope.initializeParameters($scope.nsd);
                        $scope.initializeEnvironment($scope.nsd);
                        $scope.initializeOutput($scope.nsd);

                        $scope.loadProjectPlans($scope.nsd.project_id);
                        $scope.loadProjectVectorlFiles($scope.nsd.project_id);
                        $scope.temp.load_finished = true;
            })
                    .error(function(error) {
                        console.log(error.details);
                        alert(error.details);
            });
        };
        
        $scope.getProjectName = function(project_id) {
            API.projectsRead()
                    .success(function(response) {
                        var project = _.findWhere(response.results, {id: project_id});
                        $scope.temp.project_name = project.name;
            })
                    .error(function(error) {
                        console.log(error.details);
                        alert(error.details);
            });
        };

        // If nsd file has not any parameters specified
        // initialize object and set `simtime_scale` to its
        // default value
        $scope.initializeParameters = function(nsd) {
            if (!nsd.parameters) {
                nsd.parameters = {};
                nsd.parameters.simtime_scale = -9;
                nsd.parameters.random_seed = 0;
            } else {
                if (!nsd.parameters.simtime_scale) {
                    nsd.parameters.simtime_scale = -9;
                    nsd.parameters.random_seed = 0;
                }
            }
        };
        
        $scope.initializeEnvironment = function(nsd) {
            if (nsd.environment) {
                $scope.temp.env_model = nsd.environment.type;
                $scope.temp.environment.vectorl_id = nsd.environment.vectrol_id;
                $scope.temp.environment.sensor_mapping = nsd.environment.mapping;
                
                $scope.validateVectorl();
            }
        };
        
        // If nsd file does not contain any view,
        // add the default one (dataTable)
        $scope.initializeOutput = function(nsd) {
            if (!nsd.views) {
                nsd.views = [
                    {
                        name: 'dataTable',
                        columns: [
                            {
                                name: 'node'
                            },
                            {
                                name: 'name'
                            },
                            {
                                name: 'module'
                            },
                            {
                                name: 'label'
                            },
                            {
                                name: 'n_index'
                            },
                            {
                                name: 'data'
                            }
                        ],
                        base_tables: [],
                        table_filter: '',
                        groupby: []
                    }
                ];
            }
        };
        
        // Helps us recognize selected tab, so that we can persist
        // user's state on a refresh for example.
        $scope.tabs = {
            main_selected: parseInt($location.search()['tab']) || 1
        };
        
        // Activates tab with `index` and updates `tab` query param accordingly
        $scope.setSelectedTab = function(index) {
            $scope.tabs.main_selected = index;
            $location.search('tab', index);
        };

        /////////////////////// ### Network tab related data and methods
        
        $scope.plans = [];
        
        // This method calls `projectPlansRead` api call and
        // fetches the plans created for project with id `project_id`
        $scope.loadProjectPlans = function(project_id) {
            API.projectPlansRead(project_id)
                    .success(function(response) {
                        $scope.plans = response.results;
            })
                    .error(function(error) {
                        console.log(error.details);
                        alert(error.details);
            });
        };
        
        $scope.selected_plan = {};
        $scope.hil_nodes = [];
        // Every time user selects a different plan for this project
        // we have to update its details. So on select change this function
        // is called and we fetch specific plan's details.
        $scope.fetchSelectedPlan = function(plan_id) {
            $scope.selected_plan = {};
            if (plan_id) {
                API.planRead(plan_id)
                        .success(function(response) {
                            $scope.selected_plan = _.omit(response, ['_id', '_rev']);
                            $scope.hil_nodes = _.pluck($scope.selected_plan.NodePosition, 'nodeId');
                            //console.log($scope.hil_nodes);
                })
                        .error(function(error) {
                            console.log(error.details);
                            alert(error.details);
                });
            }
        };
        
        // Controls toggle button message (if it's gonna be 'Show' or 'Hide')
        $scope.temp.planDetailsShown = false;
        
        // Controls `planDetailsShown` variable and is called every time user
        // clicks `Show/Hide Plan Details` toggle button
        $scope.togglePlanDetails = function() {
            $scope.temp.planDetailsShown = !$scope.temp.planDetailsShown;
        };
        
        /////////////////////// ### HIL related data and methods
        $scope.temp.hil = false;
        
        $scope.initializeHil = function(nsd) {
            if (nsd.hil) {
                $scope.temp.hil = true;
            }
        };
        
        /////////////////////// ### Environment related data and methods
        $scope.vectorls = [];
        
        // This method calls `projectVectorLFilesRead` api call and
        // fetches the vectorl files created for project with id `project_id`
        $scope.loadProjectVectorlFiles = function(project_id) {
            API.projectVectorLFilesRead(project_id)
                    .success(function(response) {
                        $scope.vectorls = response.results;
            })
                    .error(function(error) {
                        console.log(error.details);
                        alert(error.details);
            });
        };
        
        $scope.temp.valid_vectorl = false;
        $scope.alerts = {
            validating_vectorl: false,
            valid_vectorl: false,
            invalid_vectorl: false
        };
        
        $scope.vectorl_vars = [];
        $scope.validateVectorl = function() {
            if ($scope.temp.environment.vectorl_id) {
                $scope.alerts.valid_vectorl = false;
                $scope.alerts.invalid_vectorl = false;
                $scope.alerts.validating_vectorl = true;
            
                API.vectorlCompile($scope.temp.environment.vectorl_id)
                    .success(function(response) {
                        if (response.success) {
                            $scope.alerts.validating_vectorl = false;
                            $scope.alerts.invalid_vectorl = false;
                            $scope.alerts.valid_vectorl = true;
                            
                            $scope.vectorl_vars = response.variables;
                        } else {
                            $scope.alerts.validating_vectorl = false;
                            $scope.alerts.valid_vectorl = false;
                            $scope.alerts.invalid_vectorl = true;
                        }
                    })
                    .error(function(error) {
                        console.log(error.details);
                        alert(error.details);
                    });
            } else {
                $scope.alerts.valid_vectorl = false;
                $scope.alerts.invalid_vectorl = false;
                $scope.alerts.validating_vectorl = false;
            }
        };
        
        $scope.goToVectorl = function(id) {
            $location.path('/vectorl/' + id);
        };
        
        // ### Output tab related data and methods
        
        // Used in order to determine which view's plots to show
        $scope.selected_view = {
            index: 0
        };
        
        $scope.setSelectedView = function(view) {
            var index = _.indexOf($scope.nsd.views, view);
            $scope.selected_view.index = index;
        };
        
        // This function is called when `create new view` button is clicked
        // and opens a new create_view dialog.
        $scope.createView = function() {
            var self = this;
            ngDialog.open({
                template: 'templates/create_view.html',
                className: 'ngdialog-theme-default new-view-dialog',
                closeByDocument: false,
                // This controller controls create_view template
                controller: ['$scope', '$validator', function($scope, $validator) {
                        
                    // Boolean value used to customize 
                    // buttons in the template
                    // (If `$scope.mode.update` is true user has opened
                    // this view in order to update it so we have to replace
                    // create button with an update button)
                    //
                    $scope.mode = {
                        update: false
                    };
                    
                    // Base datasets are all the previously created views
                    $scope.base_datasets = self.nsd.views;
                    
                    // In `myData` all selected fields are going to be stored
                    $scope.myData = [];
                 
                    // Configuration for ng-Grid
                    $scope.gridOptions = { 
                        data: 'myData',
                        enableCellSelection: true,
                        enableRowSelection: false,
                        columnDefs: [
                            {
                                field: 'name', 
                                displayName: 'Name', 
                                enableCellEdit: true
                            }, 
                            {
                                field:'expression', 
                                displayName:'Expression', 
                                enableCellEdit: true
                            },
                            {
                                field:'groupby', 
                                displayName:'Group By', 
                                cellTemplate: 'templates/ng-grid_checkbox.html'
                            },
                            {
                                field: 'delete',
                                displayName: '',
                                cellTemplate: 'templates/ng-grid_delete.html',
                                cellClass: 'delete-field-cell'
                            }
                        ]
                    };
                    
                    // This method is called whenever 'Add field' button is clicked
                    // in Create view screen. It adds a new editable row to fields
                    // table.
                    //
                    $scope.addField = function() {
                        $scope.myData.push({name: 'field' + $scope.myData.length, expression: '', groupby: false});
                    };
                    
                    // This method is called when user clicks `Delete` button
                    // in a ngGrid table row. It removes selected row.
                    $scope.deleteField = function(row) {
                        $scope.myData.splice(row.rowIndex, 1);
                    };
                    
                    $scope.available_fields = [];
                    $scope.updateAvailableFields = function() {
                        $scope.available_fields = [];
                    
                        _.each($scope.view.base_tables, function(view_name) {
                            var view = _.findWhere($scope.base_datasets, { name: view_name});
                            $scope.available_fields.push(view);
                        });
                    };
                    
                    // Called when dialog's create button is clicked and
                    // adds the newly configured view to nsd's existing views.
                    // Note that this change is not persisted at the db until
                    // user clicks `Save nsd`.
                    $scope.createView = function() {
                        
                        if ($scope.view) {
                            $validator.validate($scope, 'view').success(function() {
                                $scope.view.columns = [];
                                $scope.view.groupby = [];

                                // transform `myData` table model to `columns` and `groupby`
                                // models accepted by nsd.
                                _.each($scope.myData, function(obj) {
                                    $scope.view.columns.push({ name: obj.name, expression: obj.expression });
                                    if (obj.groupby === true) {
                                        $scope.view.groupby.push(obj.name);
                                    }
                                });

                                self.nsd.views.push($scope.view);
                                $scope.closeThisDialog();

                            });
                        }
                        
                    };
                    
                    // Called when dialog's cancel button is clicked - just dismisses the dialog
                    $scope.dismissDialog = function() {
                        $scope.closeThisDialog();
                    };
                }]
            });
        };
        
        // Called when user clicks `Edit` button in a row in my views table.
        // Opens `create_view` template, initializes it with selected `view`
        // data and lets user update it.
        $scope.updateView = function(view) {
            var self = this;
            ngDialog.open({
                template: 'templates/create_view.html',
                className: 'ngdialog-theme-default new-view-dialog',
                closeByDocument: false,
                controller: ['$scope', '$validator', function($scope, $validator) {
                    $scope.mode = {
                        update: true
                    };
                    
                    // Initialize view with the selected one 
                    $scope.view = _.clone(view);
                    
                    $scope.base_datasets = [];
                    
                    // In `myData` all selected fields are going to be stored
                    $scope.myData = [];
                 
                    // Configuration for ng-Grid
                    $scope.gridOptions = { 
                        data: 'myData',
                        enableCellSelection: true,
                        enableRowSelection: false,
                        columnDefs: [
                            {
                                field: 'name', 
                                displayName: 'Name', 
                                enableCellEdit: true
                            }, 
                            {
                                field:'expression', 
                                displayName:'Expression', 
                                enableCellEdit: true
                            },
                            {
                                field:'groupby', 
                                displayName:'Group By', 
                                cellTemplate: 'templates/ng-grid_checkbox.html'
                            },
                            {
                                field: 'delete',
                                displayName: '',
                                cellTemplate: 'templates/ng-grid_delete.html',
                                cellClass: 'delete-field-cell'
                            }
                        ]
                    };
                    
                    // This method is called whenever 'Add field' button is clicked
                    // in Create view screen. It adds a new editable row to fields
                    // table.
                    //
                    $scope.addField = function() {
                        $scope.myData.push({name: 'field' + $scope.myData.length, expression: '', groupby: false});
                    };
                    
                    // This method is called when user clicks `Delete` button
                    // in a ngGrid table row. It removes selected row.
                    $scope.deleteField = function(row) {
                        $scope.myData.splice(row.rowIndex, 1);
                    };
                    
                    $scope.available_fields = [];
                    $scope.updateAvailableFields = function() {
                        $scope.available_fields = [];
                    
                        _.each($scope.view.base_tables, function(view_name) {
                            var view = _.findWhere($scope.base_datasets, { name: view_name});
                            $scope.available_fields.push(view);
                        });
                    };
                    
                    // Form `myData` object from `columns` and `groupby`
                    // objects
                    $scope.initializeGridData = function() {
                        $scope.myData = $scope.view.columns;
                        
                        _.each($scope.myData, function(obj) {
                            if (_.contains($scope.view.groupby, obj.name)) {
                                obj.groupby = true;
                            } else {
                                obj.groupby = false;
                            }
                        });
                    };
                    
                    // When updating a view, base_datasets
                    // include all views of the selected 
                    // nsd file *except* the one that is currently
                    // edited
                    $scope.initializeBaseDatasets = function() {
                        $scope.base_datasets = _.reject(self.nsd.views, function(obj) {
                            return obj.name === $scope.view.name;
                        });
                        $scope.updateAvailableFields();
                    };
                    
                    $scope.initializeGridData();
                    $scope.initializeBaseDatasets();
                    
                    $scope.updateView = function() {
                        $validator.validate($scope, 'view').success(function() {
                            view.name = $scope.view.name;
                            view.table_filter = $scope.view.table_filter;
                            view.base_tables = $scope.view.base_tables;

                            $scope.view.columns = [];
                            $scope.view.groupby = [];

                            // transform `myData` table model to `columns` and `groupby`
                            // models accepted by nsd.
                            _.each($scope.myData, function(obj) {
                                $scope.view.columns.push({ name: obj.name, expression: obj.expression });
                                if (obj.groupby === true) {
                                    $scope.view.groupby.push(obj.name);
                                }
                            });

                            view.columns = $scope.view.columns;
                            view.groupby = $scope.view.groupby;

                            $scope.closeThisDialog();
                        });
                        
                    };
                    
                    // Called when dialog's cancel button is clicked - just dismisses the dialog
                    $scope.dismissDialog = function() {
                        $scope.closeThisDialog();
                    };
                }]
            });
        };
        
        // Deletes `view` from nsd file. Note that in order that change
        // to be persisted in the database, user has to click 'Save nsd'
        $scope.deleteView = function(view) {
            var self = this;
            // Open dialog in order to ask user to confirm view deletion
            ngDialog.openConfirm({
                template: '<div class="ng-dialog-message">' +
                            '<p>You are about to delete <i><strong>' + view.name +'</strong></i> view.</p>' +
                            '<p>Are you sure?</p>' +
                        '</div>' +
                        '<div class="ng-dialog-buttons row">' +
                            '<a class="btn btn-sm btn-success listing-delete-dialog-btn" ng-click="deleteView()">Yes</a>' +
                            '<a class="btn btn-sm btn-default" ng-click="dismissDialog()">Cancel</a>' +
                        '</div>',
                plain: true,
                className: 'ngdialog-theme-default',
                controller: ['$scope', function($scope) {
                    $scope.deleteView = function() {
                        self.nsd.views = _.without(self.nsd.views, view);
                        $scope.closeThisDialog();
                    };
                    
                    $scope.dismissDialog = function() {
                        $scope.closeThisDialog();
                    };
                }]
            });
        };
        
        $scope.createPlot = function(view) {
            ngDialog.open({
                template: 'templates/create_plot.html',
                className: 'ngdialog-theme-default new-plot-dialog',
                closeByDocument: false,
                controller: ['$scope', function($scope) {
                    $scope.mode = {
                        update: false
                    };
                    
                    $scope.view = _.clone(view);
                    $scope.temp = {};
                    
                    // Once user clicks `crete` in plot dialog
                    // depending on his selection on `graph type` field
                    $scope.adjustPlot = function (graph_type) {
                        $scope.plot.rel = view.name;
                        if (graph_type === 'plot') {
                            $scope.plot.model_type = 'plot';
                            $scope.plot.stat_type = 'network';
                            _.extend($scope.plot, $scope.temp_plot);
                        } else if (graph_type === 'node parameter') {
                            $scope.plot.model_type = 'parameter';
                            $scope.plot.stat_type = 'node';
                            _.extend($scope.plot, $scope.parameter);
                        } else if (graph_type === 'network parameter') {
                            $scope.plot.model_type = 'parameter';
                            $scope.plot.stat_type = 'network';
                            _.extend($scope.plot, $scope.parameter);
                        } else if (graph_type === 'node2node parameter') {
                            $scope.plot.model_type = 'parameter';
                            $scope.plot.stat_type = 'node2node';
                            _.extend($scope.plot, $scope.parameter);
                        }
                        
                    };
                        
                    $scope.createPlot = function() {
                        // If user has clicked `Graph Type` button and has selected a value
                        if ($scope.temp.graph_type) {
                            $scope.adjustPlot($scope.temp.graph_type);
                        }
                            
                        if ($scope.plot) {
                            
                            if (!view.plots) {
                                view.plots = [];
                            }
                    
                            view.plots.push($scope.plot);
                        }
                        
                        $scope.closeThisDialog();
                    };
                    
                    $scope.dismissDialog = function() {
                        $scope.closeThisDialog();
                    };
                }]
            });
        };
        
        // Called when user clicks `Edit` button in a row in plots table.
        // Opens `create_plot` template, initializes it with selected `plot`
        // data and lets user update it.
        $scope.updatePlot = function(view, plot) {
            ngDialog.open({
                template: 'templates/create_plot.html',
                className: 'ngdialog-theme-default new-view-dialog',
                closeByDocument: false,
                controller: ['$scope', function($scope) {
                    $scope.mode = {
                        update: true
                    };
                    
                    $scope.view = _.clone(view);
                    $scope.plot = {};
                    $scope.temp = {};
                    $scope.temp_plot = {};
                    $scope.parameter = {};
                   
                    // Reads a plot and fills local model (`temp_plot`, `parameter`, etc)
                    // with data
                    $scope.readPlot = function (plot) {
                        // Plot - parameter common attributes
                        $scope.plot.title = plot.title;
                        $scope.plot.select = plot.select;
                        $scope.plot.x = plot.x;
                        $scope.plot.y = plot.y;
                        $scope.plot.x2 = plot.x2;
                        
                        // adjust graph type
                        if (plot.model_type === 'plot') {
                            $scope.temp.graph_type = 'plot';
                            var plot_fields = _.omit(plot, ['model_type', 'stat_type', 'title', 'select', 'x', 'y']);
                            _.extend($scope.temp_plot, plot_fields);
                        } else if (plot.model_type === 'parameter') {
                            if (plot.stat_type === 'network') {
                                $scope.temp.graph_type = 'network parameter';
                            } else if (plot.stat_type === 'node') {
                                $scope.temp.graph_type = 'node parameter';
                            } else {
                                $scope.temp.graph_type = 'node2node parameter';
                            }
                            
                            $scope.parameter.unit = plot.unit;
                        }
                    };
                    $scope.readPlot(plot);
                    
                    // Once user clicks `create` in plot dialog
                    // depending on his selection on `graph type` field
                    $scope.adjustPlot = function (graph_type) {
                        for (var attr in plot) {
                            delete plot[attr];
                        }
                        // Plot - parameter common attributes
                        plot.title = $scope.plot.title;
                        plot.select = $scope.plot.select;
                        plot.x = $scope.plot.x;
                        plot.y = $scope.plot.y;
                        
                        
                        if (graph_type === 'plot') {
                            plot.model_type = 'plot';
                            plot.stat_type = 'network';
                            _.extend(plot, $scope.temp_plot);
                        } else if (graph_type === 'node parameter') {
                            plot.model_type = 'parameter';
                            plot.stat_type = 'node';
                            _.extend(plot, $scope.parameter);
                        } else if (graph_type === 'network parameter') {
                            plot.model_type = 'parameter';
                            plot.stat_type = 'network';
                            _.extend(plot, $scope.parameter);
                        } else if (graph_type === 'node2node parameter') {
                            plot.model_type = 'parameter';
                            plot.stat_type = 'node2node';
                            plot.x2 = $scope.plot.x2;
                            _.extend(plot, $scope.parameter);
                        }
                        
                    };
                    
                    $scope.updatePlot = function() {
                        // note that we can't just `plot = $scope.plot`
                        // `plot` is a passed-by-value reference to an object
                        // if I change this value (plot = $scope.plot) that
                        // will not be reflected outside this function.
                        // But if I change attributes of the referenced objects
                        // those changes will be reflected to the original object
//                        for (var attr in $scope.plot) {
//                            plot[attr] = $scope.plot[attr];
//                        }

                        $scope.adjustPlot($scope.temp.graph_type);
                        $scope.closeThisDialog();
                    };
                    
                    // Called when dialog's cancel button is clicked - just dismisses the dialog
                    $scope.dismissDialog = function() {
                        $scope.closeThisDialog();
                    };
                }]
            });
        };
        
        // Deletes `plot` from a view of an nsd file. Note that in order that change
        // to be persisted in the database, user has to click 'Save nsd'
        $scope.deletePlot = function(view, plot) {
            // Open dialog in order to ask user to confirm view deletion
            ngDialog.openConfirm({
                template: '<div class="ng-dialog-message">' +
                            '<p>You are about to delete <i><strong>' + plot.title +'</strong></i> plot.</p>' +
                            '<p>Are you sure?</p>' +
                        '</div>' +
                        '<div class="ng-dialog-buttons row">' +
                            '<a class="btn btn-sm btn-success listing-delete-dialog-btn" ng-click="deletePlot()">Yes</a>' +
                            '<a class="btn btn-sm btn-default" ng-click="dismissDialog()">Cancel</a>' +
                        '</div>',
                plain: true,
                className: 'ngdialog-theme-default',
                controller: ['$scope', function($scope) {
                    $scope.deletePlot = function() {
                        view.plots = _.without(view.plots, plot);
                        $scope.closeThisDialog();
                    };
                    
                    $scope.dismissDialog = function() {
                        $scope.closeThisDialog();
                    };
                }]
            });
        };
        
        // ### Save Nsd related data and functions
        
        var success_alert_timeout = null;
        $scope.saveNsd = function() {
            // Save changes made to Environment tab
            if ($scope.temp.env_model === 'castalia') {
                $scope.nsd.environment = {
                    type: 'castalia'
                };
            } else if ($scope.temp.env_model === 'vectorl') {
                $scope.nsd.environment = {
                    type: 'vectorl',
                    vectrol_id: $scope.temp.environment.vectorl_id
                };
                $scope.nsd.environment.mapping = [];
                if ($scope.temp.environment.sensor_mapping) {
                    for (var i=0; i< $scope.temp.environment.sensor_mapping.length; i++) {
                        if ($scope.temp.environment.sensor_mapping[i]) {
                           $scope.nsd.environment.mapping.push($scope.temp.environment.sensor_mapping[i]);
                        }
                    }
                }
            }
            
            // Save changes made to HIL tab
            if (!$scope.temp.hil || !$scope.nsd.plan_id) {
                delete $scope.nsd.hil;
            }
            
            API.nsdUpdate($routeParams.id, $scope.nsd)
                    .success(function(response) {
                        $scope.nsd = response;
                        $scope.alerts.save_success = true;
                        success_alert_timeout = $timeout($scope.dismiss, 10000);
            })
                    .error(function(error) {
                        // in case of conflict get the returned `_rev`
                        // and try again
                        if (error.status === 409) {
                            $scope.nsd._rev = error.current_object._rev;
                            $scope.saveNsd();
                            return;
                        }
                        console.log(error.details);
                        alert(error.details);
            });
        };
        
        $scope.output = [
            { level: '', message: 'No output messages'}
        ];
        
        $scope.validateNsd = function() {
            $scope.output = [{ level: 'INFO', message: 'Validation started... Please Wait...'}];
            API.nsdValidate($routeParams.id)
                .success(function(response) {
                    // Show validation output at first
                    var output = [{level: '', message: 'Validation output'}];
                    output = output.concat(response.messages);

                    // If stdout message exists, show it
                    if (response.stdout !== '') {
                        output.push({level: '', message: 'Stdout output'});
                        output.push({level: 'INFO', message: response.stdout});
                    }

                    // If stderr message exists show it
//                    if (response.stderr !== '') {
//                        output.push({level: '', message: 'Stderr output'});
//                        output.push({level: 'ERROR', message: response.stderr});
//                    }

                    $scope.output = output;
                })
                .error(function(error) {
                    console.log(error.details);
                    alert(error.details);
                });
        };

        $scope.dismiss = function() {
            $scope.alerts.save_success = false;
        };

        $scope.$on('$destroy', function() {
            if (success_alert_timeout !== null) {
                $timeout.cancel(success_alert_timeout);
            }
        });

        $scope.loadNsd();

    }]);

    // Nsds list form Controller
    nsdControllers.controller('nsdListController',
        ['$scope', '$location', 'API', 'ngDialog', 'Session', function($scope, $location, API, ngDialog, Session) {

        $scope.nsds = [];
        $scope.projects = [];

        $scope.shown_nsds = [];

        $scope.filters = {
            project_id: Session.getCurrentSessionInfo().current_project_id
        };
        console.log(Session.getCurrentSessionInfo());
        // Fetches user's projects so that user can filter nsd files
        // by the project they belong to.
        $scope.fetchProjects = function() {
            API.projectsRead()
                    .success(function(response) {
                        $scope.projects = response.results;
                        $scope.readNsds();
            })
                    .error(function(error) {
                        console.log(error.details);
                        alert(error.details);
            });
        };
        
        // This function searches `projects` and returns the name of the project
        // with id `project_id`
        $scope.getProjectName = function(project_id) {
            var project = _.findWhere($scope.projects, {id: project_id});
            return project.name;
        };
        
        $scope.temp = {
            load_finished: false
        };

        // Read the list of user's nsds. For each nsd, find its project's name
        // by the corresponding id.
        $scope.readNsds = function() {
            API.nsdsRead()
                    .success(function(response) {
                        $scope.nsds = response.results;
                        _.each($scope.nsds, function(nsd) {
                            nsd.project_name = $scope.getProjectName(nsd.project_id);
                        });
                        $scope.shown_nsds = $scope.nsds;
                        $scope.temp.load_finished = true;
                        $scope.filterNsds();
            })
                    .error(function(error) {
                        console.log(error.details);
                        alert(error.details);
            });
        };

        // This function is called whenever user selects a project filter. We filter
        // nsds locally and update the results in the listing
        $scope.filterNsds = function() {
            if ($scope.filters.project_id) {
                $scope.shown_nsds = _.where($scope.nsds, {project_id: $scope.filters.project_id});
            } else {
                $scope.shown_nsds = $scope.nsds;
            }
        };
        
        // This function contains `cloneNsd` process.
        // At first, it shows a dialog in which user is asked to enter a name for
        // his new nsd file. Input is validated, and if validation is successful,
        // we fetch nsd's to clone data, and then we call `nsdCreate` API call
        // passing these data as parameters.
        //
        $scope.cloneNsd = function(nsd_id) {
            var self = this;
            ngDialog.openConfirm({
                template: 'templates/clone_nsd.html',
                className: 'ngdialog-theme-default clone-nsd-dialog',
                closeByDocument: false,
                controller: ['$scope', '$validator', function($scope, $validator) {
                        
                    $scope.clone = function() {
                        // Validates nsd name input. In success fetch data to clone.
                        $validator.validate($scope, 'new_nsd').success(function() {
                            $scope.fetchNsdToClone();
                        });
                    };
                    
                    $scope.fetchNsdToClone = function() {
                        API.nsdRead(nsd_id)
                                .success(function(response) {
                                    // Clone response, omitting `_id` and `_rev` fields
                                    var existed_nsd_data = _.omit(response, ['_id', '_rev']);
                                    // Also update nsd's name
                                    existed_nsd_data.name = $scope.new_nsd.name;
                                    // And create a new nsd from these data
                                    $scope.saveClonedNsd(existed_nsd_data);
                        })
                                .error(function(error) {
                                    console.log(error.details);
                                    alert(error.details);
                        });
                    };
                    
                    $scope.saveClonedNsd = function(nsd) {
                        API.nsdCreate(nsd)
                                .success(function(response) {
                                    $scope.closeThisDialog();
                                    self.go(response._id);
                        })
                                .error(function(error) {
                                    console.log(error.details);
                                    alert(error.details);
                        });
                    };
                    
                    $scope.dismissDialog = function() {
                        $scope.closeThisDialog();
                    };
                }]
            });
        };
        
        $scope.confirmDeleteNsd = function(nsd_id, nsd_name) {
            var self = this;
            ngDialog.openConfirm({
                template: '<div class="ng-dialog-message">' +
                            '<p>You are about to delete <i><strong>' + nsd_name +'</strong></i> NSD file.</p>' +
                            '<p>Are you sure?</p>' +
                        '</div>' +
                        '<div class="ng-dialog-buttons row">' +
                            '<a class="btn btn-sm btn-success listing-delete-dialog-btn" ng-click="deleteNsd()">Yes</a>' +
                            '<a class="btn btn-sm btn-default" ng-click="dismissDialog()">Cancel</a>' +
                        '</div>',
                plain: true,
                className: 'ngdialog-theme-default',
                controller: ['$scope', function($scope) {
                    $scope.deleteNsd = function() {
                        $scope.closeThisDialog();
                        self.deleteNsd(nsd_id);
                    };
                    
                    $scope.dismissDialog = function() {
                        $scope.closeThisDialog();
                    };
                }]
            });
        };
        
        $scope.deleteNsd = function(nsd_id) {
            API.nsdDelete(nsd_id)
                    .success(function() {
                        $scope.readNsds();
            })
                    .error(function(error) {
                        console.log(error.details);
                        alert(error.details);
            });
        };

        $scope.go = function(nsd_id) {
            $location.path('/nsd/' + nsd_id);
        };

        $scope.fetchProjects();
    }]);

});
