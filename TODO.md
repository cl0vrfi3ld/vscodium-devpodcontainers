# UX revamp todo's

## objectives/ideas:
- [] choose from available providers before entering devcontainer
    - [] get devpod providers
    - [] if none are available/devpod not installed, redirect to the devpod quickstart guide
    - [] if only one configured provider, skip the choice dialogue
    - [] list found providers with the default provider preselected
    - [] `devpod up --provider ${CHOSEN_PROVIDER} up .`
- [] better gui/view integration
    - [] fix `No view is registered with id: devpodcontainers.devpods` error
- [] devcontainer configuration utility, akin to the one available in the proprietary extension
    - [] if no `.devcontainer` config exists, offer to create one
    - [] configure based on a series of quesions, i.e "What is your preferred base image?" and/or "What features would you like to add?" 
