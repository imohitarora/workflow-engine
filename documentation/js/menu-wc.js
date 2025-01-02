'use strict';

customElements.define('compodoc-menu', class extends HTMLElement {
    constructor() {
        super();
        this.isNormalMode = this.getAttribute('mode') === 'normal';
    }

    connectedCallback() {
        this.render(this.isNormalMode);
    }

    render(isNormalMode) {
        let tp = lithtml.html(`
        <nav>
            <ul class="list">
                <li class="title">
                    <a href="index.html" data-type="index-link">workflow-engine documentation</a>
                </li>

                <li class="divider"></li>
                ${ isNormalMode ? `<div id="book-search-input" role="search"><input type="text" placeholder="Type to search"></div>` : '' }
                <li class="chapter">
                    <a data-type="chapter-link" href="index.html"><span class="icon ion-ios-home"></span>Getting started</a>
                    <ul class="links">
                        <li class="link">
                            <a href="overview.html" data-type="chapter-link">
                                <span class="icon ion-ios-keypad"></span>Overview
                            </a>
                        </li>
                        <li class="link">
                            <a href="index.html" data-type="chapter-link">
                                <span class="icon ion-ios-paper"></span>README
                            </a>
                        </li>
                                <li class="link">
                                    <a href="dependencies.html" data-type="chapter-link">
                                        <span class="icon ion-ios-list"></span>Dependencies
                                    </a>
                                </li>
                                <li class="link">
                                    <a href="properties.html" data-type="chapter-link">
                                        <span class="icon ion-ios-apps"></span>Properties
                                    </a>
                                </li>
                    </ul>
                </li>
                    <li class="chapter modules">
                        <a data-type="chapter-link" href="modules.html">
                            <div class="menu-toggler linked" data-bs-toggle="collapse" ${ isNormalMode ?
                                'data-bs-target="#modules-links"' : 'data-bs-target="#xs-modules-links"' }>
                                <span class="icon ion-ios-archive"></span>
                                <span class="link-name">Modules</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                        </a>
                        <ul class="links collapse " ${ isNormalMode ? 'id="modules-links"' : 'id="xs-modules-links"' }>
                            <li class="link">
                                <a href="modules/AppModule.html" data-type="entity-link" >AppModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-AppModule-23eeb6b73ac978ff6bedab3d85d545aa0dab4a517cf5687f490fcc1e2c96e162253c2138a586e47409eac6d8f9426b5f101f68721eae17033a356c12c721452a"' : 'data-bs-target="#xs-controllers-links-module-AppModule-23eeb6b73ac978ff6bedab3d85d545aa0dab4a517cf5687f490fcc1e2c96e162253c2138a586e47409eac6d8f9426b5f101f68721eae17033a356c12c721452a"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-AppModule-23eeb6b73ac978ff6bedab3d85d545aa0dab4a517cf5687f490fcc1e2c96e162253c2138a586e47409eac6d8f9426b5f101f68721eae17033a356c12c721452a"' :
                                            'id="xs-controllers-links-module-AppModule-23eeb6b73ac978ff6bedab3d85d545aa0dab4a517cf5687f490fcc1e2c96e162253c2138a586e47409eac6d8f9426b5f101f68721eae17033a356c12c721452a"' }>
                                            <li class="link">
                                                <a href="controllers/AppController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-AppModule-23eeb6b73ac978ff6bedab3d85d545aa0dab4a517cf5687f490fcc1e2c96e162253c2138a586e47409eac6d8f9426b5f101f68721eae17033a356c12c721452a"' : 'data-bs-target="#xs-injectables-links-module-AppModule-23eeb6b73ac978ff6bedab3d85d545aa0dab4a517cf5687f490fcc1e2c96e162253c2138a586e47409eac6d8f9426b5f101f68721eae17033a356c12c721452a"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-AppModule-23eeb6b73ac978ff6bedab3d85d545aa0dab4a517cf5687f490fcc1e2c96e162253c2138a586e47409eac6d8f9426b5f101f68721eae17033a356c12c721452a"' :
                                        'id="xs-injectables-links-module-AppModule-23eeb6b73ac978ff6bedab3d85d545aa0dab4a517cf5687f490fcc1e2c96e162253c2138a586e47409eac6d8f9426b5f101f68721eae17033a356c12c721452a"' }>
                                        <li class="link">
                                            <a href="injectables/AppService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >AppService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                            <li class="link">
                                <a href="modules/WorkflowModule.html" data-type="entity-link" >WorkflowModule</a>
                                    <li class="chapter inner">
                                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                            'data-bs-target="#controllers-links-module-WorkflowModule-c70f5f659ad9974bbc945d7aa3feedbaf7dd8f9a80b0ddad8fc948e2dcecc608348a57c9290d7a1eaf7927aa223f0647067ce51cbbeda783e91c01c88efb1ccc"' : 'data-bs-target="#xs-controllers-links-module-WorkflowModule-c70f5f659ad9974bbc945d7aa3feedbaf7dd8f9a80b0ddad8fc948e2dcecc608348a57c9290d7a1eaf7927aa223f0647067ce51cbbeda783e91c01c88efb1ccc"' }>
                                            <span class="icon ion-md-swap"></span>
                                            <span>Controllers</span>
                                            <span class="icon ion-ios-arrow-down"></span>
                                        </div>
                                        <ul class="links collapse" ${ isNormalMode ? 'id="controllers-links-module-WorkflowModule-c70f5f659ad9974bbc945d7aa3feedbaf7dd8f9a80b0ddad8fc948e2dcecc608348a57c9290d7a1eaf7927aa223f0647067ce51cbbeda783e91c01c88efb1ccc"' :
                                            'id="xs-controllers-links-module-WorkflowModule-c70f5f659ad9974bbc945d7aa3feedbaf7dd8f9a80b0ddad8fc948e2dcecc608348a57c9290d7a1eaf7927aa223f0647067ce51cbbeda783e91c01c88efb1ccc"' }>
                                            <li class="link">
                                                <a href="controllers/WorkflowController.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WorkflowController</a>
                                            </li>
                                        </ul>
                                    </li>
                                <li class="chapter inner">
                                    <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ?
                                        'data-bs-target="#injectables-links-module-WorkflowModule-c70f5f659ad9974bbc945d7aa3feedbaf7dd8f9a80b0ddad8fc948e2dcecc608348a57c9290d7a1eaf7927aa223f0647067ce51cbbeda783e91c01c88efb1ccc"' : 'data-bs-target="#xs-injectables-links-module-WorkflowModule-c70f5f659ad9974bbc945d7aa3feedbaf7dd8f9a80b0ddad8fc948e2dcecc608348a57c9290d7a1eaf7927aa223f0647067ce51cbbeda783e91c01c88efb1ccc"' }>
                                        <span class="icon ion-md-arrow-round-down"></span>
                                        <span>Injectables</span>
                                        <span class="icon ion-ios-arrow-down"></span>
                                    </div>
                                    <ul class="links collapse" ${ isNormalMode ? 'id="injectables-links-module-WorkflowModule-c70f5f659ad9974bbc945d7aa3feedbaf7dd8f9a80b0ddad8fc948e2dcecc608348a57c9290d7a1eaf7927aa223f0647067ce51cbbeda783e91c01c88efb1ccc"' :
                                        'id="xs-injectables-links-module-WorkflowModule-c70f5f659ad9974bbc945d7aa3feedbaf7dd8f9a80b0ddad8fc948e2dcecc608348a57c9290d7a1eaf7927aa223f0647067ce51cbbeda783e91c01c88efb1ccc"' }>
                                        <li class="link">
                                            <a href="injectables/WorkflowExecutionService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WorkflowExecutionService</a>
                                        </li>
                                        <li class="link">
                                            <a href="injectables/WorkflowService.html" data-type="entity-link" data-context="sub-entity" data-context-id="modules" >WorkflowService</a>
                                        </li>
                                    </ul>
                                </li>
                            </li>
                </ul>
                </li>
                        <li class="chapter">
                            <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#entities-links"' :
                                'data-bs-target="#xs-entities-links"' }>
                                <span class="icon ion-ios-apps"></span>
                                <span>Entities</span>
                                <span class="icon ion-ios-arrow-down"></span>
                            </div>
                            <ul class="links collapse " ${ isNormalMode ? 'id="entities-links"' : 'id="xs-entities-links"' }>
                                <li class="link">
                                    <a href="entities/WorkflowDefinition.html" data-type="entity-link" >WorkflowDefinition</a>
                                </li>
                                <li class="link">
                                    <a href="entities/WorkflowInstance.html" data-type="entity-link" >WorkflowInstance</a>
                                </li>
                            </ul>
                        </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#classes-links"' :
                            'data-bs-target="#xs-classes-links"' }>
                            <span class="icon ion-ios-paper"></span>
                            <span>Classes</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="classes-links"' : 'id="xs-classes-links"' }>
                            <li class="link">
                                <a href="classes/CreateWorkflowDefinitionDto.html" data-type="entity-link" >CreateWorkflowDefinitionDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/StartWorkflowDto.html" data-type="entity-link" >StartWorkflowDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/UpdateWorkflowDefinitionDto.html" data-type="entity-link" >UpdateWorkflowDefinitionDto</a>
                            </li>
                            <li class="link">
                                <a href="classes/WorkflowStepDto.html" data-type="entity-link" >WorkflowStepDto</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#interfaces-links"' :
                            'data-bs-target="#xs-interfaces-links"' }>
                            <span class="icon ion-md-information-circle-outline"></span>
                            <span>Interfaces</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? ' id="interfaces-links"' : 'id="xs-interfaces-links"' }>
                            <li class="link">
                                <a href="interfaces/RetryConfig.html" data-type="entity-link" >RetryConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StepCondition.html" data-type="entity-link" >StepCondition</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StepConfig.html" data-type="entity-link" >StepConfig</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/StepState.html" data-type="entity-link" >StepState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/TaskResult.html" data-type="entity-link" >TaskResult</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WorkflowState.html" data-type="entity-link" >WorkflowState</a>
                            </li>
                            <li class="link">
                                <a href="interfaces/WorkflowStep.html" data-type="entity-link" >WorkflowStep</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <div class="simple menu-toggler" data-bs-toggle="collapse" ${ isNormalMode ? 'data-bs-target="#miscellaneous-links"'
                            : 'data-bs-target="#xs-miscellaneous-links"' }>
                            <span class="icon ion-ios-cube"></span>
                            <span>Miscellaneous</span>
                            <span class="icon ion-ios-arrow-down"></span>
                        </div>
                        <ul class="links collapse " ${ isNormalMode ? 'id="miscellaneous-links"' : 'id="xs-miscellaneous-links"' }>
                            <li class="link">
                                <a href="miscellaneous/enumerations.html" data-type="entity-link">Enums</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/functions.html" data-type="entity-link">Functions</a>
                            </li>
                            <li class="link">
                                <a href="miscellaneous/variables.html" data-type="entity-link">Variables</a>
                            </li>
                        </ul>
                    </li>
                    <li class="chapter">
                        <a data-type="chapter-link" href="coverage.html"><span class="icon ion-ios-stats"></span>Documentation coverage</a>
                    </li>
                    <li class="divider"></li>
                    <li class="copyright">
                        Documentation generated using <a href="https://compodoc.app/" target="_blank" rel="noopener noreferrer">
                            <img data-src="images/compodoc-vectorise.png" class="img-responsive" data-type="compodoc-logo">
                        </a>
                    </li>
            </ul>
        </nav>
        `);
        this.innerHTML = tp.strings;
    }
});